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
rome_1.test('disallow unsafe usage of break, continue, throw and return', async (t) => {
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        function greet1() {
          try {
            throw new Error("Try")
          } catch(err) {
            throw err;
          } finally {
            return 1;
          }
        }
      `, { category: 'lint/noUnsafeFinally' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        function greet2() {
          try {
            throw new Error("Try")
          } catch(err) {
            throw err;
          } finally {
            break;
          }
        }
      `, { category: 'lint/noUnsafeFinally' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        function greet3() {
          try {
            throw new Error("Try")
          } catch(err) {
            throw err;
          } finally {
            continue;
          }
        }
      `, { category: 'lint/noUnsafeFinally' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        function greet4() {
          try {
            throw new Error("Try")
          } catch(err) {
            throw err;
          } finally {
            throw new Error("Finally");
          }
        }
      `, { category: 'lint/noUnsafeFinally' });
});
