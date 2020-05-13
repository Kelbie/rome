"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const js_parser_1 = require("@romejs/js-parser");
const path_1 = require("@romejs/path");
const project_1 = require("@romejs/project");
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
async function testLintMultiple(t, inputs, opts) {
    for (const input of inputs) {
        await testLint(t, input, opts);
    }
}
exports.testLintMultiple = testLintMultiple;
async function testLint(t, input, { syntax = [], category, sourceType = 'module' }) {
    t.addToAdvice({
        type: 'log',
        category: 'info',
        text: 'Lint options',
    });
    t.addToAdvice({
        type: 'inspect',
        data: {
            category,
            syntax,
            sourceType,
        },
    });
    t.addToAdvice({
        type: 'log',
        category: 'info',
        text: 'Input',
    });
    t.addToAdvice({
        type: 'code',
        code: input,
    });
    const ast = js_parser_1.parseJS({
        input,
        sourceType,
        path: path_1.createUnknownFilePath('unknown'),
        syntax,
    });
    const res = await index_1.default({
        applyFixes: true,
        options: {},
        ast,
        sourceText: input,
        project: {
            folder: undefined,
            config: project_1.DEFAULT_PROJECT_CONFIG,
        },
    });
    const diagnostics = res.diagnostics.filter((diag) => {
        return diag.description.category === category;
    }).map((diag) => {
        return {
            ...diag,
            location: {
                ...diag.location,
                sourceText: input,
            },
        };
    });
    const snapshotName = t.snapshot(cli_diagnostics_1.printDiagnosticsToString({
        diagnostics,
        suppressions: res.suppressions,
    }));
    t.namedSnapshot(`${snapshotName}: formatted`, res.src);
    t.clearAdvice();
}
exports.testLint = testLint;
