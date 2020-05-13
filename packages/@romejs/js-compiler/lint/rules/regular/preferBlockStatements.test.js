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
rome_1.test('prefer block statements', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        `if (x) x;`,
        string_utils_1.dedent `
          if (x) {
            x;
          } else y;
        `,
        string_utils_1.dedent `
          if (x) {
            x
          } else if (y) y;
        `,
    ], { category: 'lint/preferBlockStatements' });
    await testHelpers_1.testLintMultiple(t, [
        `for (;;);`,
        `for (p in obj);`,
        `for (x of xs);`,
        `do; while (x);`,
        `while (x);`,
        `with (x);`,
    ], { category: 'lint/preferBlockStatements' });
});
