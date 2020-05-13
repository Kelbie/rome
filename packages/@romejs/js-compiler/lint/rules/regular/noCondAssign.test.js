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
rome_1.test('no cond assign', async (t) => {
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        for (let i = 1; i = 10; i++) {
          console.log('foo');
        }
      `, { category: 'lint/noCondAssign' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        if (foo = 'bar') {
          console.log('foo');
        }
      `, { category: 'lint/noCondAssign' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        while (foo = 'bar') {
          console.log('foo');
        }
      `, { category: 'lint/noCondAssign' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        do {
          console.log('foo');
        } while (foo = 'bar')
      `, { category: 'lint/noCondAssign' });
});
