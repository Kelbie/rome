"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const naturalCompare_1 = require("./naturalCompare");
function orderByNatural(strs, insensitive = true) {
    return strs.sort((a, b) => naturalCompare_1.naturalCompare(a, b, insensitive));
}
exports.orderByNatural = orderByNatural;
