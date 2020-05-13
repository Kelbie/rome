"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSEnumMember(builder, node) {
    const tokens = [builder.tokenize(node.id, node)];
    if (node.initializer) {
        tokens.push(tokens_1.space, '=', tokens_1.space, builder.tokenize(node.initializer, node));
    }
    tokens.push(',');
    return tokens_1.concat(tokens);
}
exports.default = TSEnumMember;
