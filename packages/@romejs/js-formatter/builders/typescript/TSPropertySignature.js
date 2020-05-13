"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSPropertySignature(builder, node) {
    const tokens = [];
    if (node.readonly) {
        tokens.push('readonly', tokens_1.space);
    }
    tokens.push(builder.tokenize(node.key, node));
    if (node.optional) {
        tokens.push('?');
    }
    if (node.typeAnnotation) {
        tokens.push(':', tokens_1.space, builder.tokenize(node.typeAnnotation, node));
    }
    tokens.push(';');
    return tokens_1.concat(tokens);
}
exports.default = TSPropertySignature;
