"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const project_1 = require("@romejs/project");
const rome_1 = require("rome");
const js_analysis_1 = require("@romejs/js-analysis");
const js_parser_1 = require("@romejs/js-parser");
const path_1 = require("@romejs/path");
async function testCheck(code) {
    const ast = js_parser_1.parseJS({
        input: code,
        sourceType: 'module',
        path: path_1.createUnknownFilePath('unknown'),
    });
    return js_analysis_1.check({
        ast,
        project: {
            folder: undefined,
            config: project_1.DEFAULT_PROJECT_CONFIG,
        },
        provider: {
            getExportTypes() {
                return Promise.reject('unsupported');
            },
        },
    });
}
rome_1.test("discovers require('module') call", async () => {
    testCheck;
    /*const diagnostics = await testCheck(`
    const a: number = '';
  `);

  console.log(diagnostics);*/
});
