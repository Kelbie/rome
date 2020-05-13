"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowObjectTypeIndexer(builder, node) {
    let tokens = [];
    if (node.static === true) {
        tokens.push('static');
        tokens.push(tokens_1.space);
    }
    tokens.push(builder.tokenize(node.variance, node), '[');
    if (node.id !== undefined) {
        tokens.push(builder.tokenize(node.id, node), ':');
    }
    return tokens_1.concat([
        tokens_1.concat(tokens),
        tokens_1.space,
        builder.tokenize(node.key, node),
        ']',
        ':',
        tokens_1.space,
        builder.tokenize(node.value, node),
    ]);
}
exports.default = FlowObjectTypeIndexer;
