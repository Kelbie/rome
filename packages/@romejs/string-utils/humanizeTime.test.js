"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const humanizeTime_1 = require("./humanizeTime");
const rome_1 = require("rome");
rome_1.test('humanizeTime', (t) => {
    t.is(humanizeTime_1.humanizeTime(1), '0.00s');
    t.is(humanizeTime_1.humanizeTime(10), '0.01s');
    t.is(humanizeTime_1.humanizeTime(100), '0.10s');
    t.is(humanizeTime_1.humanizeTime(1000), '1s');
    t.is(humanizeTime_1.humanizeTime(10000), '10s');
    t.is(humanizeTime_1.humanizeTime(100000), '1m40s');
    t.is(humanizeTime_1.humanizeTime(1000000), '16m40s');
    t.is(humanizeTime_1.humanizeTime(10000000), '2h46m40s');
    t.is(humanizeTime_1.humanizeTime(100000000), '27h46m40s');
    t.is(humanizeTime_1.humanizeTime(1, true), '1ms');
    t.is(humanizeTime_1.humanizeTime(10, true), '10ms');
    t.is(humanizeTime_1.humanizeTime(100, true), '100ms');
    t.is(humanizeTime_1.humanizeTime(1000, true), '1s');
    t.is(humanizeTime_1.humanizeTime(10000, true), '10s');
    t.is(humanizeTime_1.humanizeTime(100000, true), '1m40s');
    t.is(humanizeTime_1.humanizeTime(1000000, true), '16m40s');
    t.is(humanizeTime_1.humanizeTime(10000000, true), '2h46m40s');
    t.is(humanizeTime_1.humanizeTime(100000000, true), '27h46m40s');
});
