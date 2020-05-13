"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const v8_1 = require("@romejs/v8");
const internalModule = require("module");
const vm = require("vm");
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
async function executeMain(opts) {
    const { path, code, sourceMap, globals } = opts;
    const filename = path.join();
    // Create global context
    const sandbox = {
        process: {
            argv: [process.argv[0], filename],
            __proto__: process,
        },
        Buffer,
        clearImmediate,
        clearInterval,
        clearTimeout,
        setImmediate,
        setInterval,
        setTimeout,
        require: internalModule.createRequire
            ? internalModule.createRequire(filename)
            : internalModule.createRequireFromPath(filename),
        console,
        __dirname: path.getParent().join(),
        __filename: filename,
        ...globals,
    };
    sandbox.global = sandbox;
    const context = vm.createContext(sandbox);
    // Here we do some gymnastics to catch a syntax error to correctly identify it as being our fault
    let script;
    try {
        script = new vm.Script(code, {
            filename,
            displayErrors: true,
        });
    }
    catch (err) {
        if (err instanceof SyntaxError && err.stack !== undefined) {
            const lineMatch = err.stack.match(/^(.*?):(\d+)/);
            if (lineMatch == null) {
                throw err;
            }
            const line = Number(lineMatch[2]);
            const pos = {
                index: ob1_1.ob1Number0Neg1,
                column: ob1_1.ob1Number0,
                line: ob1_1.ob1Coerce1(line),
            };
            const syntaxError = {
                description: {
                    ...diagnostics_1.descriptions.V8.SYNTAX_ERROR(err.message),
                    advice: [diagnostics_1.INTERNAL_ERROR_LOG_ADVICE],
                },
                location: {
                    start: pos,
                    end: pos,
                    filename,
                    sourceText: diagnostics_1.truncateSourceText(code, pos, pos),
                },
            };
            return { syntaxError };
        }
        throw err;
    }
    // Execute the script if there was no syntax error
    if (sourceMap !== undefined) {
        v8_1.sourceMapManager.addSourceMap(filename, () => sourceMap);
    }
    await script.runInContext(context);
    return { syntaxError: undefined };
}
exports.default = executeMain;
