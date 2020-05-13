"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ComputedMemberProperty(builder, node) {
    const tokens = [];
    if (node.optional) {
        tokens.push('?.');
    }
    tokens.push('[', builder.tokenize(node.value, node), ']');
    return tokens_1.concat(tokens);
}
exports.default = ComputedMemberProperty;
