"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const executeFunction_1 = require("../../utils/executeFunction");
function FunctionExpression(node, scope) {
    node = js_ast_1.functionExpression.assert(node);
    return executeFunction_1.default(node, scope, true);
}
exports.default = FunctionExpression;
