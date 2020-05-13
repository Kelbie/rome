"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const StringLiteral_1 = require("../literals/StringLiteral");
function StringLiteralTypeAnnotation(builder, node, parent) {
    return StringLiteral_1.default(builder, node, parent);
}
exports.default = StringLiteralTypeAnnotation;
