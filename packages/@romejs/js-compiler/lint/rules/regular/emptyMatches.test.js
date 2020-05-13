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
rome_1.test('empty matches; may match infinitely', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // infinite match possible
        'let a = /a*/',
        'let b = /a*(abc)?[1,2,3]*/',
        // valid regexes
        'let a = /a*(abc)+[1,2,3]?/',
        'let b = /a+(abc)*/',
    ], { category: 'lint/emptyMatches' });
});
