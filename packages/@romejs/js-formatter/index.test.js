"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("@romejs/test-helpers");
const js_parser_1 = require("@romejs/js-parser");
const string_utils_1 = require("@romejs/string-utils");
const _1 = require(".");
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
    const format = options.get('format').asStringSetOrVoid(['pretty', 'compact']);
    const inputContent = string_utils_1.removeCarriageReturn(inputFile.content.toString());
    const ast = js_parser_1.parseJS({
        input: inputContent,
        path: filename,
        allowReturnOutsideFunction,
        sourceType,
        syntax,
    });
    const formatOptions = {
        typeAnnotations: true,
        sourceText: inputContent,
        format,
        sourceMaps: false,
    };
    t.addToAdvice({
        type: 'log',
        category: 'info',
        text: 'Fomat options',
    });
    t.addToAdvice({
        type: 'inspect',
        data: {
            ...formatOptions,
        },
    });
    const printed = _1.formatJS(ast, formatOptions);
    const snapshotFile = inputFile.absolute.getParent().append(inputFile.absolute.getExtensionlessBasename()).join();
    t.namedSnapshot('Input', inputContent, undefined, {
        filename: snapshotFile,
        language: 'javascript',
    });
    t.namedSnapshot('Output', printed.code, undefined, {
        filename: snapshotFile,
        language: 'javascript',
    });
});
// @ts-ignore allow top level await
await promise;
