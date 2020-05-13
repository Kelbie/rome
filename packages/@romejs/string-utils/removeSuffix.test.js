"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const removeSuffix_1 = require("./removeSuffix");
const rome_1 = require("rome");
rome_1.test('removeSuffix', (t) => {
    const testCases = [
        { firstInput: 'romeTest', secondInput: 'Test', expected: 'rome' },
        { firstInput: 'romeTest', secondInput: 'rome', expected: 'romeTest' },
        { firstInput: 'romeTest', secondInput: '123', expected: 'romeTest' },
    ];
    testCases.forEach((td) => {
        t.is(removeSuffix_1.removeSuffix(td.firstInput, td.secondInput), td.expected);
    });
});
