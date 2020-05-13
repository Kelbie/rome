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
rome_1.test('prefer template', async (t) => {
    await testHelpers_1.testLint(t, `const foo = 'bar'; console.log(foo + 'baz')`, {
        category: 'lint/preferTemplate',
    });
    await testHelpers_1.testLint(t, `console.log((1 * 2) + 'baz')`, {
        category: 'lint/preferTemplate',
    });
});
