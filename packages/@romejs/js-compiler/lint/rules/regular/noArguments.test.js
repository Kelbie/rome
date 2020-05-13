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
rome_1.test('no arguments', async (t) => {
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        function f() {
          console.log(arguments);
        }
      `, { category: 'lint/noArguments' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        (function () {
          console.log(arguments);
        })();
      `, { category: 'lint/noArguments' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        class C {
          fn() {
            console.log(arguments);
          }
        }
      `, { category: 'lint/noArguments' });
    await testHelpers_1.testLint(t, string_utils_1.dedent `
        const o = {
          fn() {
            console.log(arguments);
          },
        };
      `, { category: 'lint/noArguments' });
});
