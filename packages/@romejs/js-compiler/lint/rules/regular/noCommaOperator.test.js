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
rome_1.test('no comma operator', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // INVALID
        '(0, 1, 2)',
    ], { category: 'lint/noCommaOperator' });
});
