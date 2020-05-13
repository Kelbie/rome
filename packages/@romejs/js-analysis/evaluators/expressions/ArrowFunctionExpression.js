"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scopes_1 = require("../../scopes");
const js_ast_1 = require("@romejs/js-ast");
const executeFunction_1 = require("../../utils/executeFunction");
function ArrowFunctionExpression(node, scope) {
    node = js_ast_1.arrowFunctionExpression.assert(node);
    let thisContext;
    const funcScope = scope.findOptional(scopes_1.FunctionScope);
    if (funcScope !== undefined) {
        thisContext = funcScope.meta.thisContext;
    }
    return executeFunction_1.default(node, scope, true, thisContext);
}
exports.default = ArrowFunctionExpression;
