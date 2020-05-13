"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const NumericT_1 = require("../../types/NumericT");
function NumberKeywordTypeAnnotation(node, scope) {
    node = js_ast_1.numberKeywordTypeAnnotation.assert(node);
    return new NumericT_1.default(scope, node);
}
exports.default = NumberKeywordTypeAnnotation;
