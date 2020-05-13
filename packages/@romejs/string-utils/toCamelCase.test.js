"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const toCamelCase_1 = require("./toCamelCase");
const rome_1 = require("rome");
rome_1.test('toCamelCase', (t) => {
    const testCases = [
        { input: 'rometest', expected: 'rometest' },
        { input: 'rome test', expected: 'romeTest' },
        { input: 'RoMe TeSt', expected: 'RoMeTeSt' },
        { input: 'ROME TEST', expected: 'ROMETEST' },
    ];
    testCases.forEach((td) => {
        t.is(toCamelCase_1.toCamelCase(td.input), td.expected);
    });
});
