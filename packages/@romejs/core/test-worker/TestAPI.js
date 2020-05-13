"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const events_1 = require("@romejs/events");
const string_diff_1 = require("@romejs/string-diff");
const v8_1 = require("@romejs/v8");
const pretty_format_1 = require("@romejs/pretty-format");
const string_markup_1 = require("@romejs/string-markup");
function formatExpectedError(expected) {
    if (typeof expected === 'string') {
        return JSON.stringify(expected);
    }
    if (expected instanceof RegExp) {
        return String(expected);
    }
    if (typeof expected === 'function') {
        return expected.name;
    }
    return 'unknown';
}
function matchExpectedError(error, expected) {
    if (expected === undefined) {
        return true;
    }
    if (typeof expected === 'string') {
        return error.message.includes(expected);
    }
    if (expected instanceof RegExp) {
        return expected.test(error.message);
    }
    if (typeof expected === 'function') {
        return error instanceof expected;
    }
    return false;
}
class TestAPI {
    constructor({ testName, onTimeout, file, snapshotManager, options, emitDiagnostic, }) {
        this.testName = testName;
        this.options = options;
        this.snapshotManager = snapshotManager;
        this.snapshotCounter = 0;
        this.file = file;
        this.teardownEvent = new events_1.Event({ name: 'TestAPI.teardown' });
        this.startTime = Date.now();
        this.onTimeout = onTimeout;
        this.emitDiagnostic = emitDiagnostic;
        this.timeoutMax = 0;
        this.timeoutId = undefined;
        this.setTimeout(5000);
        this.advice = [];
    }
    buildMatchAdvice(received, expected, { visualMethod, expectedAlias, receivedAlias, } = {}) {
        let expectedFormat;
        let receivedFormat;
        if (typeof received === 'string' && typeof expected === 'string') {
            expectedFormat = expected;
            receivedFormat = received;
        }
        else {
            expectedFormat = pretty_format_1.default(expected);
            receivedFormat = pretty_format_1.default(received);
        }
        const advice = [];
        if (expectedFormat === receivedFormat) {
            // Better error message when both values are visually identical
            advice.push({
                type: 'log',
                category: 'info',
                text: `Both the received and expected values are visually identical`,
            });
            advice.push({
                type: 'code',
                code: expectedFormat,
            });
            if (visualMethod !== undefined) {
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: `Try using t.${visualMethod} if you wanted a visual match`,
                });
            }
        }
        else {
            const bothSingleLine = !expectedFormat.match(/\n/g) && !receivedFormat.match(/\n/g);
            if (!bothSingleLine) {
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: `Expected to receive`,
                });
                advice.push({
                    type: 'code',
                    code: expectedFormat,
                });
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: `But got`,
                });
                advice.push({
                    type: 'code',
                    code: receivedFormat,
                });
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: 'Diff',
                });
            }
            advice.push({
                type: 'diff',
                diff: string_diff_1.default(expectedFormat, receivedFormat),
                legend: {
                    add: receivedAlias ? receivedAlias : 'Received',
                    delete: expectedAlias ? expectedAlias : 'Expected',
                },
            });
        }
        return advice;
    }
    addToAdvice(item) {
        this.advice.push(item);
    }
    clearAdvice() {
        this.advice = [];
    }
    onTeardown(callback) {
        this.teardownEvent.subscribe(callback);
    }
    clearTimeout() {
        if (this.timeoutId !== undefined) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutMax = undefined;
        this.timeoutStart = undefined;
    }
    extendTimeout(time) {
        const { timeoutMax, timeoutStart } = this;
        if (timeoutMax === undefined || timeoutStart === undefined) {
            throw new Error('No timeout set');
        }
        const elapsed = Date.now() - timeoutStart;
        const newTime = timeoutMax - elapsed + time;
        this.setTimeout(newTime);
    }
    setTimeout(time) {
        this.clearTimeout();
        this.timeoutStart = Date.now();
        this.timeoutMax = time;
        this.timeoutId = setTimeout(() => {
            this.onTimeout(time);
        }, time);
    }
    checkTimeout() {
        const { startTime, timeoutMax } = this;
        if (timeoutMax === undefined) {
            return;
        }
        const delta = Date.now() - startTime;
        if (delta > timeoutMax) {
            throw new Error(`Test timeout - exceeded ${String(timeoutMax)}ms`);
        }
    }
    fail(message = 'Test failure triggered by t.fail()', advice = [], framesToShift = 0) {
        const diag = diagnostics_1.deriveDiagnosticFromErrorStructure(v8_1.getErrorStructure(new Error(), framesToShift + 1), {
            description: {
                category: 'tests/failure',
                message: diagnostics_1.createBlessedDiagnosticMessage(message),
                advice,
            },
        });
        throw diagnostics_1.createSingleDiagnosticError(diag);
    }
    truthy(value, message = 'Expected value to be truthy') {
        if (Boolean(value) === false) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Received`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(value),
                },
            ], 1);
        }
    }
    falsy(value, message = 'Expected value to be falsy') {
        if (Boolean(value) === true) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Received`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(value),
                },
            ], 1);
        }
    }
    true(value, message = 'Expected value to be true') {
        if (value !== true) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Received`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(value),
                },
            ], 1);
        }
    }
    false(value, message = 'Expected value to be false') {
        if (value !== false) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Received`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(value),
                },
            ], 1);
        }
    }
    is(received, expected, message = 't.is() failed, using Object.is semantics') {
        if (Object.is(received, expected) !== true) {
            this.fail(message, this.buildMatchAdvice(received, expected, {
                visualMethod: 'looksLike',
            }), 1);
        }
    }
    not(received, expected, message = 't.not() failed, using !Object.is() semantics') {
        if (Object.is(received, expected) === true) {
            this.fail(message, this.buildMatchAdvice(received, expected, {
                visualMethod: 'notLooksLike',
            }), 1);
        }
    }
    looksLike(received, expected, message = 't.looksLike() failed, using prettyFormat semantics') {
        const actualInspect = pretty_format_1.default(received);
        const expectedInspect = pretty_format_1.default(expected);
        if (actualInspect !== expectedInspect) {
            this.fail(message, this.buildMatchAdvice(received, expected), 1);
        }
    }
    notLooksLike(received, expected, message = 't.notLooksLike() failed, using !prettyFormat semantics') {
        const actualInspect = pretty_format_1.default(received);
        const expectedInspect = pretty_format_1.default(expected);
        if (actualInspect === expectedInspect) {
            this.fail(message, this.buildMatchAdvice(received, expected), 1);
        }
    }
    throws(thrower, expected, message = 't.throws() failed, callback did not throw an error') {
        try {
            thrower();
        }
        catch (err) {
            if (matchExpectedError(err, expected)) {
                return undefined;
            }
            else {
                this.fail(`t.throws() expected an error to be thrown that matches ${formatExpectedError(expected)} but got ${err.name}: ${JSON.stringify(err.message)}`, diagnostics_1.getErrorStackAdvice(v8_1.getErrorStructure(err), 'Incorrect error stack trace'), 1);
            }
        }
        this.fail(message, undefined, 1);
    }
    async throwsAsync(thrower, expected, message = 't.throws() failed, callback did not throw an error') {
        try {
            await thrower();
        }
        catch (err) {
            if (matchExpectedError(err, expected)) {
                return undefined;
            }
            else {
                this.fail(`t.throws() expected an error to be thrown that matches ${formatExpectedError(expected)} but got ${err.name}: ${JSON.stringify(err.message)}`, diagnostics_1.getErrorStackAdvice(v8_1.getErrorStructure(err), 'Incorrect error stack trace'), 1);
            }
        }
        this.fail(message, undefined, 1);
    }
    notThrows(nonThrower, message = 't.notThrows() failed, callback threw an error') {
        try {
            nonThrower();
        }
        catch (err) {
            const advice = diagnostics_1.getErrorStackAdvice(v8_1.getErrorStructure(err), `t.notThrows did not expect an error to be thrown but got ${err.name}: ${JSON.stringify(err.message)}`);
            this.fail(message, advice, 1);
        }
    }
    async notThrowsAsync(nonThrower, message = 't.notThrowsAsync failed, callback threw an error') {
        try {
            await nonThrower();
        }
        catch (err) {
            const advice = diagnostics_1.getErrorStackAdvice(v8_1.getErrorStructure(err), `t.notThrowsAsync did not expect an error to be thrown but got ${err.name}: ${JSON.stringify(err.message)}`);
            this.fail(message, advice, 1);
        }
    }
    regex(contents, regex, message = 't.regex failed, using RegExp.test semantics') {
        if (!regex.test(contents)) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Expected`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(contents),
                },
                {
                    type: 'log',
                    category: 'info',
                    text: `to match pattern`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(regex.source),
                },
            ], 1);
        }
    }
    notRegex(contents, regex, message = 't.regex failed, using RegExp.test semantics') {
        if (regex.test(contents)) {
            this.fail(message, [
                {
                    type: 'log',
                    category: 'info',
                    text: `Expected`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(contents),
                },
                {
                    type: 'log',
                    category: 'info',
                    text: `to not match pattern`,
                },
                {
                    type: 'code',
                    code: pretty_format_1.default(regex.source),
                },
            ], 1);
        }
    }
    inlineSnapshot(received, snapshot) {
        const callFrame = v8_1.getErrorStructure(new Error()).frames[1];
        const callError = v8_1.getErrorStructure(new Error(), 1);
        this.onTeardown(async () => {
            const { status } = this.snapshotManager.testInlineSnapshot(callFrame, received, snapshot);
            if (status === 'UPDATE' && this.options.freezeSnapshots) {
                await this.emitDiagnostic(diagnostics_1.deriveDiagnosticFromError(callError, {
                    description: diagnostics_1.descriptions.SNAPSHOTS.INLINE_FROZEN,
                }));
            }
            if (status === 'NO_MATCH') {
                await this.emitDiagnostic(diagnostics_1.deriveDiagnosticFromError(callError, {
                    description: {
                        ...diagnostics_1.descriptions.SNAPSHOTS.INLINE_BAD_MATCH,
                        advice: this.buildMatchAdvice(received, snapshot, {
                            receivedAlias: 'What the code gave us',
                            expectedAlias: 'Existing inline snapshot',
                        }),
                    },
                }));
            }
        });
    }
    snapshot(expected, message, opts) {
        const id = this.snapshotCounter++;
        return this.bufferSnapshot({
            entryName: String(id),
            expected,
            message,
            opts,
        });
    }
    namedSnapshot(entryName, expected, message, opts) {
        return this.bufferSnapshot({
            entryName,
            expected,
            message,
            opts,
        });
    }
    bufferSnapshot({ entryName, message, expected, opts = {}, }) {
        let language = opts.language;
        let formatted = '';
        if (typeof expected === 'string') {
            formatted = expected;
        }
        else {
            language = 'javascript';
            formatted = pretty_format_1.default(expected);
        }
        const callError = v8_1.getErrorStructure(new Error(), 2);
        this.onTeardown(async () => {
            // Get the current snapshot
            const existingSnapshot = await this.snapshotManager.get(this.testName, entryName, opts.filename);
            if (existingSnapshot === undefined) {
                if (this.options.freezeSnapshots) {
                    await this.emitDiagnostic(diagnostics_1.deriveDiagnosticFromError(callError, {
                        description: diagnostics_1.descriptions.SNAPSHOTS.FROZEN,
                    }));
                }
                else {
                    // No snapshot exists, let's save this one!
                    this.snapshotManager.set({
                        testName: this.testName,
                        entryName,
                        value: formatted,
                        language,
                        optionalFilename: opts.filename,
                    });
                }
                return;
            }
            // Compare the snapshots
            if (formatted !== existingSnapshot) {
                const advice = this.buildMatchAdvice(formatted, existingSnapshot, {
                    receivedAlias: 'What the code gave us',
                    expectedAlias: 'Existing snapshot',
                });
                if (message === undefined) {
                    message = string_markup_1.markup `Snapshot ${entryName} at <filelink emphasis target="${this.snapshotManager.defaultSnapshotPath.join()}" /> doesn't match`;
                }
                else {
                    message = string_markup_1.escapeMarkup(message);
                    advice.push({
                        type: 'log',
                        category: 'info',
                        text: string_markup_1.markup `Snapshot can be found at <filelink emphasis target="${this.snapshotManager.defaultSnapshotPath.join()}" />`,
                    });
                }
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `Run <command>rome test <filelink target="${this.file.uid}" /> --update-snapshots</command> to update this snapshot`,
                });
                await this.emitDiagnostic(diagnostics_1.deriveDiagnosticFromError(callError, {
                    description: {
                        category: 'tests/snapshots/incorrect',
                        message: diagnostics_1.createBlessedDiagnosticMessage(message),
                        advice,
                    },
                }));
            }
        });
        return entryName;
    }
}
exports.default = TestAPI;
