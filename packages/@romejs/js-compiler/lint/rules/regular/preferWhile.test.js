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
rome_1.test('prefer while', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        string_utils_1.dedent `
          for (; x.running;) {
            x.step();
          }
        `,
        string_utils_1.dedent `
          for (;;) {
            doSomething();
          }
        `,
    ], { category: 'lint/preferWhile' });
});
