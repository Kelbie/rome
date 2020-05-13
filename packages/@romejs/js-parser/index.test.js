"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_parser_1 = require("@romejs/js-parser");
const test_helpers_1 = require("@romejs/test-helpers");
const string_utils_1 = require("@romejs/string-utils");
const promise = test_helpers_1.createFixtureTests(async (fixture, t) => {
    const { options, files } = fixture;
    // Get the input JS
    const inputFile = files.get('input.js') ||
        files.get('input.mjs') ||
        files.get('input.ts') ||
        files.get('input.tsx');
    if (inputFile === undefined) {
        throw new Error(`The fixture ${fixture.dir} did not have an input.(mjs|js|ts|tsx)`);
    }
    const sourceTypeProp = options.get('sourceType');
    const sourceType = sourceTypeProp.asString('script');
    if (sourceType !== 'module' && sourceType !== 'script') {
        throw sourceTypeProp.unexpected();
    }
    const allowReturnOutsideFunction = options.get('allowReturnOutsideFunction').asBoolean(false);
    const filename = inputFile.relative;
    const syntax = options.get('syntax').asArray(true).map((item) => {
        return item.asStringSet(['jsx', 'ts', 'flow']);
    });
    t.addToAdvice({
        type: 'log',
        category: 'info',
        text: 'Parser options',
    });
    t.addToAdvice({
        type: 'inspect',
        data: {
            filename: filename.join(),
            allowReturnOutsideFunction,
            sourceType,
            syntax,
        },
    });
    const inputContent = string_utils_1.removeCarriageReturn(inputFile.content.toString());
    const ast = js_parser_1.parseJS({
        input: inputContent,
        path: filename,
        allowReturnOutsideFunction,
        sourceType,
        syntax,
    });
    const outputFile = inputFile.absolute.getParent().append(inputFile.absolute.getExtensionlessBasename()).join();
    t.snapshot(ast, undefined, { filename: outputFile });
});
// @ts-ignore Doesn't support top-level await lol
await promise;
