"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_escape_1 = require("@romejs/string-escape");
function RegExpCharacter(builder, node, parent) {
    const isInCharSet = parent.type === 'RegExpCharSet';
    if (isInCharSet) {
        switch (node.value) {
            case '$':
            case '^':
            case '.':
            case '?':
            case '{':
            case '}':
            case '+':
            case '*':
            case '[':
            case ']':
            case '(':
            case ')':
            case '|':
                return node.value;
            case '-':
                return '\\-';
        }
    }
    switch (node.value) {
        case '\t':
            return '\\t';
        case '\n':
            return '\\n';
        case '\r':
            return '\\r';
        case '\x0b':
            return '\\v';
        case '\f':
            return '\\f';
        case '\b':
            return '\\b';
        case '/':
        case '\\':
        case '$':
        case '^':
        case '.':
        case '?':
        case '{':
        case '}':
        case '+':
        case '*':
        case '[':
        case ']':
        case '(':
        case ')':
        case '|':
            return `\\${node.value}`;
        default:
            return string_escape_1.escapeString(node.value, { json: true, unicodeOnly: true });
    }
}
exports.default = RegExpCharacter;
