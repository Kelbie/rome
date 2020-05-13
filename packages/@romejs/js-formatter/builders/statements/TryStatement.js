"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TryStatement(builder, node) {
    const tokens = [
        'try',
        tokens_1.space,
        builder.tokenize(node.block, node),
    ];
    if (node.handler) {
        tokens.push(tokens_1.space, builder.tokenize(node.handler, node));
    }
    if (node.finalizer) {
        tokens.push(tokens_1.space, 'finally', tokens_1.space, builder.tokenize(node.finalizer, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = TryStatement;
