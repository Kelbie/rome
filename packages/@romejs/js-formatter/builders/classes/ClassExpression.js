"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ClassDeclaration_1 = require("./ClassDeclaration");
function ClassExpression(builder, node) {
    return ClassDeclaration_1.default(builder, node);
}
exports.default = ClassExpression;
