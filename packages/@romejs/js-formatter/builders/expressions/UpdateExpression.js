"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function UpdateExpression(builder, node) {
    if (node.prefix === true) {
        return tokens_1.concat([node.operator, builder.tokenize(node.argument, node)]);
    }
    else {
        return tokens_1.concat([builder.tokenize(node.argument, node), node.operator]);
    }
}
exports.default = UpdateExpression;
