"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ObjectExpression_1 = require("../objects/ObjectExpression");
function AssignmentObjectPattern(builder, node) {
    return ObjectExpression_1.default(builder, node);
}
exports.default = AssignmentObjectPattern;
