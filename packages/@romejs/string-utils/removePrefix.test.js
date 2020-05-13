"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const removePrefix_1 = require("./removePrefix");
const rome_1 = require("rome");
rome_1.test('removePrefix', (t) => {
    const testCases = [
        { firstInput: 'romeTest', secondInput: 'rome', expected: 'Test' },
        { firstInput: 'Testrome', secondInput: 'rome', expected: 'Testrome' },
        { firstInput: 'romeTest', secondInput: '123', expected: 'romeTest' },
    ];
    testCases.forEach((td) => {
        t.is(removePrefix_1.removePrefix(td.firstInput, td.secondInput), td.expected);
    });
});
