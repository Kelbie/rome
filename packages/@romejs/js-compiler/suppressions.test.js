"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const suppressions_1 = require("./suppressions");
const CompilerContext_1 = require("./lib/CompilerContext");
const js_parser_1 = require("@romejs/js-parser");
const string_utils_1 = require("@romejs/string-utils");
function extractSuppressionsFromSource(sourceText) {
    const ast = js_parser_1.parseJS({
        sourceType: 'script',
        path: 'unknown',
        input: sourceText,
    });
    const context = new CompilerContext_1.default({ ast });
    return suppressions_1.extractSuppressionsFromProgram(context, ast);
}
rome_1.test('single category', async (t) => {
    t.snapshot(extractSuppressionsFromSource(string_utils_1.dedent `
      // rome-ignore foo
      foo();

      /** rome-ignore bar */
      bar();

      /**
       * rome-ignore yes
       */
      yes();

      /**
       * hello
       * rome-ignore wow
       */
      wow();
    `));
});
rome_1.test('multiple categories', async (t) => {
    t.snapshot(extractSuppressionsFromSource(string_utils_1.dedent `
      // rome-ignore foo dog
      foo();

      /** rome-ignore bar cat */
      bar();

      /**
       * rome-ignore yes frog
       */
      yes();

      /**
       * hello
       * rome-ignore wow fish
       */
      wow();
    `));
});
rome_1.test('duplicates', async (t) => {
    t.snapshot(extractSuppressionsFromSource(string_utils_1.dedent `
      // rome-ignore dog dog
      foo();

      // rome-ignore dog cat dog
      bar();
    `));
});
