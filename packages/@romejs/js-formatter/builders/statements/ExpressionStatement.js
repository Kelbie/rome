"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ExpressionStatement(builder, node) {
    return tokens_1.concat([builder.tokenize(node.expression, node), ';']);
}
exports.default = ExpressionStatement;
