"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowTypeParameter(builder, node) {
    const tokens = [
        builder.tokenize(node.variance, node),
        node.name,
    ];
    if (node.bound) {
        tokens.push(builder.tokenize(node.bound, node));
    }
    if (node.default) {
        return tokens_1.concat([
            tokens_1.concat(tokens),
            tokens_1.space,
            '=',
            tokens_1.space,
            builder.tokenize(node.default, node),
        ]);
    }
    else {
        return tokens_1.concat(tokens);
    }
}
exports.default = FlowTypeParameter;
