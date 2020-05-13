"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function CatchClause(builder, node) {
    if (node.param) {
        return tokens_1.concat([
            'catch',
            tokens_1.space,
            '(',
            builder.tokenize(node.param, node),
            ') ',
            builder.tokenize(node.body, node),
        ]);
    }
    else {
        return tokens_1.concat(['catch', tokens_1.space, builder.tokenize(node.body, node)]);
    }
}
exports.default = CatchClause;
