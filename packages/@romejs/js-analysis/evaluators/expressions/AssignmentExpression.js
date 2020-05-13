"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const SideEffectT_1 = require("../../types/SideEffectT");
function AssignmentExpression(node, scope) {
    node = js_ast_1.assignmentExpression.assert(node);
    const { left, right, operator } = node;
    if (operator === '=') {
        const rightType = scope.evaluate(right);
        const leftType = scope.evaluate(left);
        leftType.shouldMatch(rightType);
        return new SideEffectT_1.default(scope, node, rightType);
    }
    else {
        // TODO!
        return undefined;
    }
}
exports.default = AssignmentExpression;
