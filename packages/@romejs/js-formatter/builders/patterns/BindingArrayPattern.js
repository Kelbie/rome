"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const ArrayExpression_1 = require("../expressions/ArrayExpression");
const utils_1 = require("../utils");
function BindingArrayPattern(builder, node) {
    return tokens_1.concat([
        ArrayExpression_1.default(builder, node),
        utils_1.printPatternMeta(builder, node, node.meta),
    ]);
}
exports.default = BindingArrayPattern;
