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
rome_1.test('disallow unnecessary boolean casts', async (t) => {
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        if (Boolean(foo)) {
          return foo;
        }
      `, { category: 'lint/noExtraBooleanCast' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        while (!!foo) {
          return foo;
        }
      `, { category: 'lint/noExtraBooleanCast' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        let x = 1;
        do {
          1 + 1;
        } while (Boolean(x));
      `, { category: 'lint/noExtraBooleanCast' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        for (; !!foo; ) {
          return 1 + 1;
        }
      `, { category: 'lint/noExtraBooleanCast' });
});
