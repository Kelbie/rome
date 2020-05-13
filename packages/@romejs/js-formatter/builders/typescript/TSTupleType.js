"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const comments_1 = require("../comments");
function TSTupleType(builder, node) {
    if (node.elementTypes.length === 0 && node.rest === undefined) {
        if (comments_1.hasInnerComments(node)) {
            return tokens_1.concat([
                '[',
                builder.tokenizeInnerComments(node, true),
                tokens_1.hardline,
                ']',
            ]);
        }
        else {
            return '[]';
        }
    }
    const parts = [];
    for (const elementType of node.elementTypes) {
        parts.push(builder.tokenize(elementType, node));
    }
    if (node.rest !== undefined) {
        parts.push(tokens_1.concat(['...', builder.tokenize(node.rest, node)]));
    }
    const tokens = [
        '[',
        tokens_1.indent(tokens_1.concat([tokens_1.softline, tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), parts)])),
    ];
    if (node.rest === undefined) {
        tokens.push(tokens_1.ifBreak(','));
    }
    tokens.push(tokens_1.softline, ']');
    return tokens_1.group(tokens_1.concat(tokens));
}
exports.default = TSTupleType;
