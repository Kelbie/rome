"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSMappedType(builder, node) {
    const tokens = [];
    if (node.readonly) {
        tokens.push(tokenIfPlusMinus(builder, node.readonly), 'readonly', tokens_1.space);
    }
    const { typeParameter } = node;
    tokens.push('[', typeParameter.name, tokens_1.space, 'in', tokens_1.space, builder.tokenize(typeParameter.constraint, typeParameter), ']');
    if (node.optional) {
        tokens.push(tokenIfPlusMinus(builder, node.optional), '?');
    }
    if (node.typeAnnotation) {
        tokens.push(':', tokens_1.space, builder.tokenize(node.typeAnnotation, node));
    }
    return tokens_1.group(tokens_1.concat(['{', tokens_1.indent(tokens_1.concat([tokens_1.softline, tokens_1.concat(tokens)])), tokens_1.softline, '}']));
}
exports.default = TSMappedType;
function tokenIfPlusMinus(builder, token) {
    switch (token) {
        case '+':
        case '-':
            return token;
        default:
            return '';
    }
}
