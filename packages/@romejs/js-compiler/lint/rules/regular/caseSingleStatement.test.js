"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const testHelpers_1 = require("../testHelpers");
const string_utils_1 = require("@romejs/string-utils");
rome_1.test('case single statement', async (t) => {
    // VALID
    await testHelpers_1.testLintMultiple(t, [
        // Single statement
        string_utils_1.dedent `
          switch (foo) {
            case true:
            case false:
              return 'yes';
          }
        `,
        // Single block
        string_utils_1.dedent `
          switch (foo) {
            case true: {
              // empty
            }
          }
        `,
        // Nothing
        string_utils_1.dedent `
          switch (foo) {
            case true:
          }
        `,
    ], { category: 'lint/caseSingleStatement' });
    // INVALID
    await testHelpers_1.testLintMultiple(t, [
        // Multiple statements
        string_utils_1.dedent `
          switch (foo) {
            case true:
            case false:
              let foo = '';
              foo;
          }
        `,
    ], { category: 'lint/caseSingleStatement' });
});
