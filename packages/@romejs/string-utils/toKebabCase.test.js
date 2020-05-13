"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const toKebabCase_1 = require("./toKebabCase");
const rome_1 = require("rome");
rome_1.test('toKebabCase', (t) => {
    const testCases = [
        { input: 'rometest', expected: 'rometest' },
        { input: 'rome test', expected: 'rome-test' },
        { input: 'RoMe TeSt', expected: 'ro-me-te-st' },
        { input: 'ROME TEST', expected: 'rome-test' },
    ];
    testCases.forEach((td) => {
        t.is(toKebabCase_1.toKebabCase(td.input), td.expected);
    });
});
