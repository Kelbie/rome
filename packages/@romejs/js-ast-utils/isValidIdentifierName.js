"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_parser_utils_1 = require("@romejs/js-parser-utils");
/**
 * This performs a basic check to see if a string is a valid identifier name.
 *
 * Note that sometimes this may return false positives. For example, there are some
 * identifiers that are valid as references but not as bindings.
 *
 * So whatever you decide to do with this check, ensure that it's not causing any
 * unintentional semantics.
 */
function isValidIdentifierName(name) {
    if (name.length === 0) {
        return false;
    }
    if (js_parser_utils_1.isStrictReservedWord(name, true)) {
        return false;
    }
    if (js_parser_utils_1.isStrictBindReservedWord(name, true)) {
        return false;
    }
    if (js_parser_utils_1.isES2015ReservedWord(name)) {
        return false;
    }
    if (js_parser_utils_1.isKeyword(name)) {
        return false;
    }
    if (js_parser_utils_1.isIdentifierStart(js_parser_utils_1.getFullCharCodeAt(name, 0)) === false) {
        return false;
    }
    let i = 1;
    while (i < name.length) {
        const code = js_parser_utils_1.getFullCharCodeAt(name, i);
        if (js_parser_utils_1.isIdentifierChar(code)) {
            i += code <= 65535 ? 1 : 2;
        }
        else {
            return false;
        }
    }
    return true;
}
exports.default = isValidIdentifierName;
