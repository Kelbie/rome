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
function FunctionDeclaration(node, scope) {
    node = js_ast_1.functionDeclaration.assert(node);
    const func = executeFunction_1.default(node, scope, false);
    if (node.id !== undefined) {
        scope.addBinding(node.id.name, func);
    }
    return func;
}
exports.default = FunctionDeclaration;
