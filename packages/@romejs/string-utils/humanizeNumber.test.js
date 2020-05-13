"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const humanizeNumber_1 = require("./humanizeNumber");
const rome_1 = require("rome");
rome_1.test('humanizeNumber', (t) => {
    t.is(humanizeNumber_1.humanizeNumber(0), '0');
    t.is(humanizeNumber_1.humanizeNumber(500), '500');
    t.is(humanizeNumber_1.humanizeNumber(1000), '1_000');
    t.is(humanizeNumber_1.humanizeNumber(10000), '10_000');
    t.is(humanizeNumber_1.humanizeNumber(100000), '100_000');
    t.is(humanizeNumber_1.humanizeNumber(1000000), '1_000_000');
    t.is(humanizeNumber_1.humanizeNumber(10000000), '10_000_000');
    t.is(humanizeNumber_1.humanizeNumber(0, ','), '0');
    t.is(humanizeNumber_1.humanizeNumber(500, ','), '500');
    t.is(humanizeNumber_1.humanizeNumber(1000, ','), '1,000');
    t.is(humanizeNumber_1.humanizeNumber(10000, ','), '10,000');
    t.is(humanizeNumber_1.humanizeNumber(100000, ','), '100,000');
    t.is(humanizeNumber_1.humanizeNumber(1000000, ','), '1,000,000');
    t.is(humanizeNumber_1.humanizeNumber(10000000, ','), '10,000,000');
});
