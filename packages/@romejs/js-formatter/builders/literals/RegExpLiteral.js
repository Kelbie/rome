"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function RegExpLiteral(builder, node) {
    const flags = [];
    if (node.global === true) {
        flags.push('g');
    }
    if (node.multiline === true) {
        flags.push('m');
    }
    if (node.sticky === true) {
        flags.push('y');
    }
    if (node.insensitive === true) {
        flags.push('i');
    }
    if (node.noDotNewline === true) {
        flags.push('s');
    }
    if (node.unicode === true) {
        flags.push('u');
    }
    return tokens_1.concat([
        '/',
        builder.tokenize(node.expression, node),
        '/',
        flags.join(''),
    ]);
}
exports.default = RegExpLiteral;
