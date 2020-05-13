"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const isEscaped_1 = require("./isEscaped");
const ob1_1 = require("@romejs/ob1");
function escapeSplit(input, splitChar) {
    const parts = [];
    const unescapeRegex = new RegExp(`\\\\${splitChar}`, 'g');
    let buff = '';
    function push() {
        buff = buff.replace(unescapeRegex, splitChar);
        parts.push(buff);
        buff = '';
    }
    for (let i = 0; i < input.length; i++) {
        let char = input[i];
        if (!isEscaped_1.isEscaped(ob1_1.ob1Coerce0(i), input) && char === splitChar) {
            push();
        }
        else {
            buff += char;
        }
    }
    push();
    return parts;
}
exports.escapeSplit = escapeSplit;
