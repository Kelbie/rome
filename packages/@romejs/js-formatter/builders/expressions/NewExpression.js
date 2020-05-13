"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const CallExpression_1 = require("./CallExpression");
function NewExpression(builder, node) {
    return tokens_1.concat(['new', tokens_1.space, CallExpression_1.default(builder, node)]);
}
exports.default = NewExpression;
