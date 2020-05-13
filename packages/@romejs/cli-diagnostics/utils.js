"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const highlightCode_1 = require("./highlightCode");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
function showInvisibles(str) {
    let ret = '';
    for (const cha of str) {
        switch (cha) {
            case ' ': {
                ret += '\xb7'; // Middle Dot, \u00B7
                break;
            }
            case '\r': {
                ret += '\u240d';
                break;
            }
            case '\n': {
                ret += '\u23ce'; // Return Symbol, \u23ce
                break;
            }
            case '\t': {
                ret += '\u21b9'; // Left Arrow To Bar Over Right Arrow To Bar, \u21b9
                break;
            }
            default: {
                ret += cha;
                break;
            }
        }
    }
    return ret;
}
exports.showInvisibles = showInvisibles;
function cleanEquivalentString(str) {
    str = string_markup_1.markupToPlainTextString(str);
    // Replace all whitespace with spaces
    str = str.replace(/[\s\n]+/g, ' ');
    // Remove trailing dot
    str = str.replace(/\.+$/, '');
    // Remove surrounding quotes
    str = str.replace(/^"(.*?)"$/, '$1');
    return str;
}
exports.cleanEquivalentString = cleanEquivalentString;
function joinNoBreak(lines) {
    return `<nobr>${lines.join('\n')}</nobr>`;
}
exports.joinNoBreak = joinNoBreak;
function splitLines(src) {
    return src.replace(/\t/g, ' ').split(js_parser_utils_1.NEWLINE);
}
exports.splitLines = splitLines;
function toLines(opts) {
    const highlighted = highlightCode_1.default(opts);
    const lines = splitLines(highlighted);
    return lines;
}
exports.toLines = toLines;
