"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This file contains code licensed under MIT from the jsesc project:
 *
 *   https://github.com/mathiasbynens/jsesc
 *
 * And is covered by the following license:
 *
 *   Copyright Mathias Bynens <https://mathiasbynens.be/>
 *
 *   Permission is hereby granted, free of charge, to any person obtaining
 *   a copy of this software and associated documentation files (the
 *   "Software"), to deal in the Software without restriction, including
 *   without limitation the rights to use, copy, modify, merge, publish,
 *   distribute, sublicense, and/or sell copies of the Software, and to
 *   permit persons to whom the Software is furnished to do so, subject to
 *   the following conditions:
 *
 *   The above copyright notice and this permission notice shall be
 *   included in all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *   LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *   WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const constants_1 = require("./constants");
const parser_core_1 = require("@romejs/parser-core");
// This regex represents printable ASCII characters, except the characters: '"\`
const PRINTABLE_ASCII = /[ !#-&\(-\[\]-_a-~]/;
function escapeChar(char, ignoreWhitespaceEscapes) {
    switch (char) {
        case '"':
            return '\\"';
        case "'":
            return "\\'";
        case '\b':
            return '\\b';
        case '\f':
            return '\\f';
        case '\\':
            return '\\\\';
    }
    if (ignoreWhitespaceEscapes) {
        return undefined;
    }
    switch (char) {
        case '\n':
            return '\\n';
        case '\r':
            return '\\r';
        case '\t':
            return '\\t';
    }
    return undefined;
}
function escapeString(str, opts = {}) {
    let index = -1;
    let result = '';
    const { ignoreWhitespaceEscapes = false, quote = '', json = false, unicodeOnly = false, } = opts;
    // Loop over each code unit in the string and escape it
    while (++index < str.length) {
        const char = str[index];
        // Handle surrogate pairs in non-JSON mode
        if (!json) {
            const charCode = str.charCodeAt(index);
            const isHighSurrogate = charCode >= 55296 && charCode <= 56319;
            const hasNextCodePoint = str.length > index + 1;
            const isSurrogatePairStart = isHighSurrogate && hasNextCodePoint;
            if (isSurrogatePairStart) {
                const nextCharCode = str.charCodeAt(index + 1);
                const isLowSurrogate = nextCharCode >= 56320 && nextCharCode <= 57343;
                if (isLowSurrogate) {
                    // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                    const codePoint = (charCode - 55296) * 1024 + nextCharCode - 56320 + 65536;
                    const hex = codePoint.toString(16);
                    result += `\\u{${hex}}`;
                    index++;
                    continue;
                }
            }
        }
        //
        if (PRINTABLE_ASCII.test(char)) {
            // It’s a printable ASCII character that is not `"`, `'` or `\`,
            // so don’t escape it.
            result += char;
            continue;
        }
        // Escape double quotes
        if (char === constants_1.DOUBLE_QUOTE) {
            result += quote === char ? '\\"' : char;
            continue;
        }
        // Escape single quotes
        if (char === constants_1.SINGLE_QUOTE) {
            result += quote === char ? "\\'" : char;
            continue;
        }
        // Escape back tick
        if (char === constants_1.TICK_QUOTE) {
            result += quote === char ? '\\`' : char;
            continue;
        }
        // Null escape
        if (char === '\0' && !json && !parser_core_1.isDigit(str[index + 1])) {
            result += '\\0';
            continue;
        }
        // Simple escapes
        if (!unicodeOnly) {
            const replacement = escapeChar(char, ignoreWhitespaceEscapes);
            if (replacement !== undefined) {
                result += replacement;
                continue;
            }
        }
        // Unicode escape
        const hex = char.charCodeAt(0).toString(16);
        const isLonghand = json || hex.length > 2;
        const modifier = isLonghand ? 'u' : 'x';
        const code = `0000${hex}`.slice(isLonghand ? -4 : -2);
        const escaped = `\\${modifier}${code}`;
        result += escaped;
        continue;
    }
    return `${quote}${result}${quote}`;
}
exports.default = escapeString;
