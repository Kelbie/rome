"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const NumericLiteralT_1 = require("../../types/NumericLiteralT");
function NumericLiteral(node, scope) {
    node = js_ast_1.numericLiteral.assert(node);
    return new NumericLiteralT_1.default(scope, node, node.value);
}
exports.default = NumericLiteral;
