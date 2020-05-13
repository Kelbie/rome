"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const string_utils_1 = require("@romejs/string-utils");
const testHelpers_1 = require("../testHelpers");
rome_1.test('jsx key', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // INVALID
        'const a = [<div />, <div />]',
        string_utils_1.dedent(`
          const a = [1, 2].map(x => <div>{x}</div>);
        `),
        string_utils_1.dedent(`
          const a = [1, 2].map(x => {
            return <div>{x}</div>;
          });
        `),
        string_utils_1.dedent(`
          const a = [1, 2].map(function(x) {
            return <div>{x}</div>;
          });
        `),
        // VALID
        'const a = [<div key="a" />, <div key={"b"} />]',
        string_utils_1.dedent(`
          const a = [1, 2].map(x => <div key={x}>{x}</div>);
        `),
        string_utils_1.dedent(`
          const a = [1, 2].map(x => {
            return <div key={x}>{x}</div>;
          });
        `),
        string_utils_1.dedent(`
          const a = [1, 2].map(function(x) {
            return <div key={x}>{x}</div>;
          });
        `),
    ], { category: 'lint/jsxKey' });
});
