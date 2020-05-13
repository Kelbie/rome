"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ob1_1 = require("@romejs/ob1");
function isEscaped(index, input) {
    const prevChar = input[ob1_1.ob1Get0(index) - 1];
    if (prevChar === '\\') {
        return !isEscaped(ob1_1.ob1Dec(index), input);
    }
    else {
        return false;
    }
}
exports.isEscaped = isEscaped;
