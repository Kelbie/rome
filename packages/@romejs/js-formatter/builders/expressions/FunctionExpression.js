"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FunctionExpression(builder, node) {
    const tokens = [];
    if (node.head.async === true) {
        tokens.push('async');
        tokens.push(tokens_1.space);
    }
    tokens.push('function');
    if (node.head.generator === true) {
        tokens.push('*');
    }
    if (node.id) {
        tokens.push(tokens_1.space, builder.tokenize(node.id, node));
    }
    tokens.push(builder.tokenize(node.head, node), tokens_1.space, builder.tokenize(node.body, node));
    return tokens_1.concat(tokens);
}
exports.default = FunctionExpression;
