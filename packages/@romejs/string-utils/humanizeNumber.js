"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const SCIENTIFIC_NOTATION = /e/i;
function humanizeNumber(num, sep = '_') {
    let str = String(num);
    if (num < 1000) {
        return str;
    }
    if (SCIENTIFIC_NOTATION.test(str)) {
        return str;
    }
    const decimals = str.split('.');
    let intChars = String(decimals.shift()).split('');
    let intParts = [];
    while (intChars.length > 0) {
        const part = intChars.slice(-3).join('');
        intParts.unshift(part);
        intChars = intChars.slice(0, -3);
    }
    return [intParts.join(sep), ...decimals].join('.');
}
exports.humanizeNumber = humanizeNumber;
