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
rome_1.test('enforce single var declarator', async (t) => {
    // Autofix
    await testHelpers_1.testLint(t, `let foo, bar;`, {
        category: 'lint/singleVarDeclarator',
    });
    // Ignores loop heads
    await testHelpers_1.testLint(t, `for (let i = 0, x = 1; i < arr.length; i++) {}`, {
        category: 'lint/singleVarDeclarator',
    });
});
