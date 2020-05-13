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
rome_1.test('negation else', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // INVALID
        'if (!true) {consequent;} else {alternate;}',
        '!true ? consequent : alternate',
        // VALID
        'if (!true) {consequent;}',
        'true ? consequent : alternate',
    ], { category: 'lint/negationElse' });
});
