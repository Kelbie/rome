"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Forked from the project https://github.com/nwoltman/string-natural-compare by Nathan Woltman
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015-2016 Nathan Woltman
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const string_charcodes_1 = require("@romejs/string-charcodes");
function naturalCompare(a, b, insensitive = true) {
    if (insensitive) {
        a = a.toLowerCase();
        b = b.toLowerCase();
    }
    const lengthA = a.length;
    const lengthB = b.length;
    let aIndex = 0;
    let bIndex = 0;
    while (aIndex < lengthA && bIndex < lengthB) {
        let charCodeA = a.charCodeAt(aIndex);
        let charCodeB = b.charCodeAt(bIndex);
        if (string_charcodes_1.isDigit(charCodeA)) {
            if (!string_charcodes_1.isDigit(charCodeB)) {
                return charCodeA - charCodeB;
            }
            let numStartA = aIndex;
            let numStartB = bIndex;
            while (charCodeA === 48 && ++numStartA < lengthA) {
                charCodeA = a.charCodeAt(numStartA);
            }
            while (charCodeB === 48 && ++numStartB < lengthB) {
                charCodeB = b.charCodeAt(numStartB);
            }
            let numEndA = numStartA;
            let numEndB = numStartB;
            while (numEndA < lengthA && string_charcodes_1.isDigit(a.charCodeAt(numEndA))) {
                ++numEndA;
            }
            while (numEndB < lengthB && string_charcodes_1.isDigit(b.charCodeAt(numEndB))) {
                ++numEndB;
            }
            let difference = numEndA - numStartA - numEndB + numStartB; // numA length - numB length
            if (difference) {
                return difference;
            }
            while (numStartA < numEndA) {
                difference = a.charCodeAt(numStartA++) - b.charCodeAt(numStartB++);
                if (difference) {
                    return difference;
                }
            }
            aIndex = numEndA;
            bIndex = numEndB;
            continue;
        }
        if (charCodeA !== charCodeB) {
            return charCodeA - charCodeB;
        }
        ++aIndex;
        ++bIndex;
    }
    return lengthA - lengthB;
}
exports.naturalCompare = naturalCompare;
