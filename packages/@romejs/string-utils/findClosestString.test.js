"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const findClosestStringMatch_1 = require("./findClosestStringMatch");
const rome_1 = require("rome");
rome_1.test('findClosestStringMatch', (t) => {
    t.is(findClosestStringMatch_1.findClosestStringMatch('french', ['quebec', '123', 'france', 'frenc']), 'frenc');
    t.is(findClosestStringMatch_1.findClosestStringMatch('iphone', ['ipod', 'iphone 5s', 'iphones x']), 'iphone 5s');
    t.is(findClosestStringMatch_1.findClosestStringMatch('french', ['quebec', '123', 'france', 'frenc'], 0.9), undefined);
    t.is(findClosestStringMatch_1.findClosestStringMatch('iphone', ['ipod', 'iphone 5s', 'iphones x'], 0.9), undefined);
});
