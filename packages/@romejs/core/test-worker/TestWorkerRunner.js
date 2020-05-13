"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const SnapshotManager_1 = require("./SnapshotManager");
const TestAPI_1 = require("./TestAPI");
const executeMain_1 = require("../common/utils/executeMain");
const files_1 = require("../common/types/files");
const path_1 = require("@romejs/path");
const string_markup_1 = require("@romejs/string-markup");
const v8_1 = require("@romejs/v8");
const pretty_format_1 = require("@romejs/pretty-format");
const MAX_RUNNING_TESTS = 20;
function cleanFrames(frames) {
    // TODO we should actually get the frames before module init and do it that way
    // Remove everything before the original module factory
    let latestTestWorkerFrame = frames.find((frame, i) => {
        if (frame.typeName === 'global' &&
            frame.methodName === undefined &&
            frame.functionName === undefined) {
            // We are the global.<anonymous> frame
            // Now check for Script.runInContext
            const nextFrame = frames[i + 1];
            if (nextFrame !== undefined &&
                nextFrame.typeName === 'Script' &&
                nextFrame.methodName === 'runInContext') {
                // Yes!
                // TODO also check for ___$romejs$core$common$utils$executeMain_ts$default (packages/romejs/core/common/utils/executeMain.ts:69:17)
                return true;
            }
        }
        return false;
    });
    // And if there was no module factory frame, then we must be inside of a test
    if (latestTestWorkerFrame === undefined) {
        latestTestWorkerFrame = frames.find((frame) => {
            return (frame.typeName !== undefined &&
                frame.typeName.includes('$TestWorkerRunner'));
        });
    }
    if (latestTestWorkerFrame === undefined) {
        return frames;
    }
    return frames.slice(0, frames.indexOf(latestTestWorkerFrame));
}
class TestWorkerRunner {
    constructor(opts, bridge) {
        this.opts = opts;
        this.locked = false;
        this.file = files_1.convertTransportFileReference(opts.file);
        this.options = opts.options;
        this.bridge = bridge;
        this.projectFolder = path_1.createAbsoluteFilePath(opts.projectFolder);
        this.snapshotManager = new SnapshotManager_1.default(this, path_1.createAbsoluteFilePath(opts.file.real));
        this.hasDiagnostics = false;
        this.consoleAdvice = [];
        this.hasFocusedTests = false;
        this.focusedTests = [];
        this.pendingDiagnostics = [];
        this.foundTests = new Map();
    }
    createConsole() {
        const addDiagnostic = (category, args) => {
            let textParts = [];
            if (args.length === 1 && typeof args[0] === 'string') {
                textParts.push(string_markup_1.escapeMarkup(args[0]));
            }
            else {
                textParts = args.map((arg) => pretty_format_1.default(arg, { markup: true }));
            }
            const text = textParts.join(' ');
            const err = new Error();
            // Remove the first two frames to get to the actual source
            const frames = cleanFrames(v8_1.getErrorStructure(err).frames.slice(2));
            this.consoleAdvice.push({
                type: 'log',
                category,
                text,
            });
            this.consoleAdvice = this.consoleAdvice.concat(diagnostics_1.getErrorStackAdvice(v8_1.getErrorStructure({
                ...err,
                frames,
            })));
        };
        function log(...args) {
            addDiagnostic('none', args);
        }
        return {
            assert(expression, ...args) {
                if (!expression) {
                    args[0] = `Assertion failed${args.length === 0 ? '' : `: ${args[0]}`}`;
                    addDiagnostic('warn', args);
                }
            },
            dir(obj) {
                addDiagnostic('info', [obj]);
            },
            error: (...args) => {
                addDiagnostic('error', args);
            },
            warn: (...args) => {
                addDiagnostic('warn', args);
            },
            dirxml: log,
            debug: log,
            info: (...args) => {
                addDiagnostic('info', args);
            },
            log,
            trace: log,
            // Noop
            count() { },
            countReset() { },
            table() { },
            time() { },
            timeEnd() { },
            timeLog() { },
            clear() { },
            group() { },
            groupCollapsed() { },
            groupEnd() { },
            profile() { },
            profileEnd() { },
            timeStamp() { },
        };
    }
    //  Global variables to expose to tests
    getEnvironment() {
        const testOptions = {
            dirname: this.file.real.getParent().join(),
            register: (callsiteError, opts, callback) => {
                this.registerTest(callsiteError, opts, callback);
            },
        };
        return {
            __ROME__TEST_OPTIONS__: testOptions,
            console: this.createConsole(),
        };
    }
    // execute the test file and discover tests
    async discoverTests() {
        const { code } = this.opts;
        try {
            const res = await executeMain_1.default({
                path: this.file.real,
                code,
                globals: this.getEnvironment(),
            });
            if (res.syntaxError !== undefined) {
                const message = `A bundle was generated that contained a syntax error: ${res.syntaxError.description.message.value}`;
                throw diagnostics_1.createSingleDiagnosticError({
                    ...res.syntaxError,
                    description: {
                        ...res.syntaxError.description,
                        message: diagnostics_1.createBlessedDiagnosticMessage(message),
                        advice: [diagnostics_1.INTERNAL_ERROR_LOG_ADVICE],
                    },
                    location: {
                        ...res.syntaxError.location,
                        filename: this.file.uid,
                    },
                });
            }
        }
        catch (err) {
            await this.onError(undefined, {
                error: err,
                firstAdvice: [],
                lastAdvice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: string_markup_1.markup `Error occured while executing test file <filelink emphasis target="${this.file.uid}" />`,
                    },
                ],
            });
        }
    }
    lockTests() {
        this.locked = true;
    }
    registerTest(callsiteError, options, callback) {
        if (this.locked) {
            throw new Error("Test can't be added outside of init");
        }
        let testName = options.name;
        if (Array.isArray(testName)) {
            testName = testName.join(' > ');
        }
        if (this.foundTests.has(testName)) {
            throw new Error(`Test ${testName} has already been defined`);
        }
        this.foundTests.set(testName, {
            callback,
            options,
        });
        if (options.only === true) {
            const callsiteStruct = v8_1.getErrorStructure(callsiteError, 1);
            this.focusedTests.push({
                testName,
                location: v8_1.getSourceLocationFromErrorFrame(callsiteStruct.frames[0]),
            });
            this.hasFocusedTests = true;
            if (!this.options.focusAllowed) {
                const diag = this.deriveDiagnosticFromErrorStructure(callsiteStruct);
                this.pendingDiagnostics.push({
                    ...diag,
                    description: {
                        ...diag.description,
                        message: diagnostics_1.createBlessedDiagnosticMessage('Focused tests are not allowed due to a set flag'),
                    },
                });
            }
        }
    }
    async emitDiagnostic(diag, ref, advice) {
        let origin = {
            category: 'test/error',
            message: 'Generated from a test worker without being attached to a test',
        };
        if (ref !== undefined) {
            origin.message = string_markup_1.markup `Generated from the file <filelink target="${this.file.uid}" /> and test name "${ref.testName}"`;
        }
        let label = diag.label;
        if (label !== undefined && ref !== undefined) {
            label = string_markup_1.escapeMarkup(ref.testName);
        }
        diag = {
            ...diag,
            label,
            description: {
                ...diag.description,
                advice: [...diag.description.advice, ...(advice || [])],
            },
        };
        this.hasDiagnostics = true;
        await this.bridge.testDiagnostic.call({ diagnostic: diag, origin });
    }
    deriveDiagnosticFromErrorStructure(struct) {
        return diagnostics_1.deriveDiagnosticFromErrorStructure(struct, {
            description: {
                category: 'tests/failure',
            },
            filename: this.file.real.join(),
            cleanFrames,
        });
    }
    async onError(testName, opts) {
        let diagnostic = this.deriveDiagnosticFromErrorStructure(v8_1.getErrorStructure(opts.error));
        diagnostic = {
            ...diagnostic,
            unique: true,
            description: {
                ...diagnostic.description,
                advice: [
                    ...(opts.firstAdvice || []),
                    ...diagnostic.description.advice,
                    ...(opts.lastAdvice || []),
                ],
            },
        };
        await this.emitDiagnostic(diagnostic, testName === undefined ? undefined : this.createTestRef(testName));
    }
    async teardownTest(testName, api) {
        api.clearTimeout();
        try {
            await api.teardownEvent.callOptional();
            return true;
        }
        catch (err) {
            await this.onError(testName, {
                error: err,
                firstAdvice: [],
                lastAdvice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: `Error occured while running <emphasis>teardown</emphasis> for test <emphasis>${testName}</emphasis>`,
                    },
                    ...api.advice,
                ],
            });
            return false;
        }
    }
    createTestRef(testName) {
        return {
            testName,
            filename: this.file.real.join(),
        };
    }
    async runTest(testName, callback) {
        let onTimeout = () => {
            throw new Error("Promise wasn't created. Should be impossible.");
        };
        const timeoutPromise = new Promise((resolve, reject) => {
            onTimeout = (time) => {
                reject(new Error(`Test timeout - exceeded ${String(time)}ms`));
            };
        });
        const ref = this.createTestRef(testName);
        const emitDiagnostic = (diag) => {
            return this.emitDiagnostic(diag, ref, api.advice);
        };
        const api = new TestAPI_1.default({
            file: this.file,
            testName,
            onTimeout,
            snapshotManager: this.snapshotManager,
            options: this.options,
            emitDiagnostic,
        });
        let testSuccess = false;
        try {
            const { diagnostics } = await diagnostics_1.catchDiagnostics(async () => {
                const res = callback(api);
                // Ducktyping this to detect a cross-realm Promise
                if (res !== undefined && typeof res.then === 'function') {
                    await Promise.race([timeoutPromise, res]);
                }
            });
            if (diagnostics !== undefined) {
                for (const diag of diagnostics) {
                    await emitDiagnostic(diag);
                }
            }
            testSuccess = true;
        }
        catch (err) {
            await this.onError(testName, {
                error: err,
                firstAdvice: [],
                lastAdvice: api.advice,
            });
        }
        finally {
            const teardownSuccess = await this.teardownTest(testName, api);
            await this.bridge.testFinish.call({
                success: testSuccess && teardownSuccess,
                ref,
            });
        }
    }
    async run(opts) {
        const promises = new Set();
        const { foundTests } = this;
        // Emit error about no found tests. If we already have diagnostics then there was an issue
        // during initialization.
        if (foundTests.size === 0 && !this.hasDiagnostics) {
            this.emitDiagnostic({
                location: {
                    filename: this.file.uid,
                },
                description: diagnostics_1.descriptions.TESTS.UNDECLARED,
            });
        }
        // We could be pretending we have focused tests here but at least one file was execueted with
        // focused tests
        if (opts.onlyFocusedTests) {
            this.hasFocusedTests = true;
        }
        // Execute all the tests
        for (const [testName, test] of foundTests) {
            const { options, callback } = test;
            if (this.hasFocusedTests && !test.options.only) {
                continue;
            }
            this.bridge.testStart.send({
                ref: {
                    filename: this.file.real.join(),
                    testName,
                },
                timeout: options.timeout,
            });
            const promise = this.runTest(testName, callback);
            if (this.options.syncTests) {
                await promise;
            }
            else {
                promise.then(() => {
                    promises.delete(promise);
                });
                promises.add(promise);
                // if there's 5 promises, then wait for one of them to finish
                if (promises.size > MAX_RUNNING_TESTS) {
                    await Promise.race(Array.from(promises));
                }
            }
        }
        // Execute the remaining tests
        await Promise.all(Array.from(promises));
        // Save the snapshot
        await this.snapshotManager.save();
        if (this.hasDiagnostics && this.consoleAdvice.length > 0) {
            await this.emitDiagnostic({
                description: diagnostics_1.descriptions.TESTS.LOGS(this.consoleAdvice),
                location: {
                    filename: this.file.uid,
                },
            });
        }
        for (const diag of this.pendingDiagnostics) {
            await this.emitDiagnostic(diag);
        }
        return {
            inlineSnapshotUpdates: this.snapshotManager.inlineSnapshotsUpdates,
            snapshotCounts: this.snapshotManager.snapshotCounts,
        };
    }
    async emitFoundTests() {
        const tests = [];
        for (const testName of this.foundTests.keys()) {
            tests.push({
                filename: this.file.real.join(),
                testName,
            });
        }
        await this.bridge.testsFound.call(tests);
    }
    async wrap(callback) {
        try {
            const { diagnostics } = await diagnostics_1.catchDiagnostics(callback);
            if (diagnostics !== undefined) {
                for (const diagnostic of diagnostics) {
                    await this.emitDiagnostic(diagnostic);
                }
            }
        }
        catch (err) {
            await this.onError(undefined, {
                error: err,
                firstAdvice: [],
                lastAdvice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: string_markup_1.markup `Error occured while executing test file <filelink emphasis target="${this.file.uid}" />`,
                    },
                    diagnostics_1.INTERNAL_ERROR_LOG_ADVICE,
                ],
            });
        }
    }
    async prepare() {
        await this.wrap(async () => {
            await this.snapshotManager.init();
            await this.discoverTests();
            await this.emitFoundTests();
            this.lockTests();
        });
        return { focusedTests: this.focusedTests };
    }
}
exports.default = TestWorkerRunner;
