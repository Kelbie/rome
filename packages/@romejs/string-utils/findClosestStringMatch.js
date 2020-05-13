"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const orderBySimilarity_1 = require("./orderBySimilarity");
function findClosestStringMatch(name, matches, minRating = 0.8) {
    if (matches.length === 0) {
        return undefined;
    }
    if (matches.length === 1) {
        return matches[0];
    }
    const ratings = orderBySimilarity_1.orderBySimilarity(name, matches);
    const bestMatch = ratings[0];
    if (bestMatch.rating >= minRating) {
        return bestMatch.target;
    }
    else {
        return undefined;
    }
}
exports.findClosestStringMatch = findClosestStringMatch;
