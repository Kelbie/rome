"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
const TestMasterRunner_1 = require("../testing/TestMasterRunner");
const Bundler_1 = require("../bundler/Bundler");
const fileHandlers_1 = require("../../common/fileHandlers");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.CODE_QUALITY,
    description: 'run tests',
    usage: '',
    examples: [],
    defineFlags(c) {
        return {
            coverage: c.get('coverage').asBoolean(false),
            showAllCoverage: c.get('showAllCoverage').asBoolean(false),
            updateSnapshots: c.get('updateSnapshots').asBoolean(false),
            freezeSnapshots: c.get('freezeSnapshots').asBoolean(false),
            focusAllowed: c.get('focusAllowed').asBoolean(true),
            syncTests: c.get('syncTests').asBoolean(false),
        };
    },
    async callback(req, commandFlags) {
        const { paths } = await req.getFilesFromArgs({
            tryAlternateArg: (path) => {
                if (path.hasExtension('test')) {
                    return undefined;
                }
                else {
                    return path.getParent().append(`${path.getExtensionlessBasename()}.test${path.getExtensions()}`);
                }
            },
            test: (path) => path.hasExtension('test'),
            noun: 'test',
            verb: 'testing',
            configCategory: 'tests',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Searched for files with <emphasis>.test.*</emphasis> file extension',
                },
            ],
            extensions: fileHandlers_1.JS_EXTENSIONS,
            disabledDiagnosticCategory: 'tests/disabled',
        });
        let addDiagnostics = [];
        const tests = new Map();
        const bundler = new Bundler_1.default(req, req.getBundlerConfigFromFlags({
            mocks: true,
        }));
        for (const [path, res] of await bundler.bundleMultiple(Array.from(paths), {
            deferredSourceMaps: true,
        })) {
            tests.set(path.join(), {
                code: res.entry.js.content,
                sourceMap: res.entry.sourceMap.map,
                ref: req.master.projectManager.getFileReference(path),
            });
        }
        const runner = new TestMasterRunner_1.default({
            addDiagnostics,
            options: {
                ...commandFlags,
                verboseDiagnostics: req.query.requestFlags.verboseDiagnostics,
            },
            sources: tests,
            request: req,
        });
        await runner.init();
    },
});
