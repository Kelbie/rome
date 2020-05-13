"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const analyzeDependencies_1 = require("./analyzeDependencies");
const project_1 = require("@romejs/project");
const rome_1 = require("rome");
const js_parser_1 = require("@romejs/js-parser");
const path_1 = require("@romejs/path");
const string_utils_1 = require("@romejs/string-utils");
async function testAnalyzeDeps(input, sourceType) {
    return await analyzeDependencies_1.default({
        options: {},
        ast: js_parser_1.parseJS({ input, sourceType, path: path_1.createUnknownFilePath('unknown') }),
        sourceText: input,
        project: {
            folder: undefined,
            config: project_1.DEFAULT_PROJECT_CONFIG,
        },
    });
}
rome_1.test("discovers require('module') call", async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import * as foo from 'foo';

          function yeah() {
            require('bar');
          }
        `, 'module'));
});
rome_1.test('ignores require(dynamic) call', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          require(dynamic);
        `, 'module'));
});
rome_1.test('ignores require() call if shadowed', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          {
            function require() {}
            require('yes');
          }

          function yes() {
            function require() {}
            require('yes');
          }
        `, 'script'));
});
rome_1.test("discovers async import('foo')", async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import('./foo');

          function yes() {
            import('./bar');
          }
        `, 'module'));
});
rome_1.test('discovers local export specifiers', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export {foo, bar, yes as no};
        `, 'module'));
});
rome_1.test('discovers export declarations', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export const yes = '';
          export function foo() {}
          export class Bar {}
        `, 'module'));
});
rome_1.test('discovers export default', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export default 'yes';
        `, 'module'));
});
rome_1.test('discovers export from', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export {foo, bar, default as no, boo as noo} from 'foobar';
        `, 'module'));
});
rome_1.test('discovers export star', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export * from 'foobar';
        `, 'module'));
});
rome_1.test('discovers import star', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import * as bar from 'foobar';
        `, 'module'));
});
rome_1.test('discovers import specifiers', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import {bar, foo, default as lol, ya as to} from 'foobar';
        `, 'module'));
});
rome_1.test('discovers import default', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import bar from 'foobar';
        `, 'module'));
});
rome_1.test('discovers commonjs exports', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          exports.yes = function() {};
        `, 'script'));
});
rome_1.test('discovers commonjs module.exports', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          module.exports = function() {};
        `, 'script'));
});
rome_1.test('discovers top level await', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          await foobar();
        `, 'module'));
});
rome_1.test('correctly identifies a file with es imports as es', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import 'bar';
        `, 'module'));
});
rome_1.test('correctly identifies a file with es exports as es', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export const foo = 'bar';
        `, 'module'));
});
rome_1.test('correctly identifies a file with cjs exports as cjs', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          exports.foo = 'bar';
        `, 'module'));
});
rome_1.test('correctly identifies a file with no imports or exports as unknown', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          foo();
        `, 'module'));
});
rome_1.test('disallow mix of es and cjs exports', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          export const foo = 'bar';
          exports.bar = 'foo';
        `, 'script'));
});
rome_1.test('defines topLevelLocalBindings', async (t) => {
    t.snapshot(await testAnalyzeDeps(string_utils_1.dedent `
          import {bar} from 'foo';
          const foo = 'bar';
        `, 'module'));
});
