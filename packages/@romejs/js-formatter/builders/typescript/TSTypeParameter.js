"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSTypeParameter(builder, node) {
    const tokens = [node.name];
    if (node.constraint) {
        tokens.push(tokens_1.space, 'extends', tokens_1.space, builder.tokenize(node.constraint, node));
    }
    if (node.default) {
        tokens.push(tokens_1.space, '=', tokens_1.space, builder.tokenize(node.default, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = TSTypeParameter;
