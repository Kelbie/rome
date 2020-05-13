"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSTypePredicate(builder, node) {
    const tokens = [];
    if (node.asserts) {
        tokens.push('asserts', tokens_1.space);
    }
    tokens.push(builder.tokenize(node.parameterName, node));
    if (node.typeAnnotation) {
        tokens.push(tokens_1.space, 'is', tokens_1.space, builder.tokenize(node.typeAnnotation, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = TSTypePredicate;
