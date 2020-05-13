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
const ExhaustiveT_1 = require("../../types/ExhaustiveT");
const RefineTypeofT_1 = require("../../types/RefineTypeofT");
const BinaryOpT_1 = require("../../types/BinaryOpT");
function maybeRefine(node, left, right, scope) {
    const evaluator = scope.evaluator;
    if (left.type === 'Identifier') {
        scope.addBinding(left.name, evaluator.getTypeFromEvaluatedNode(right));
        return true;
    }
    if (left.type === 'UnaryExpression' &&
        left.operator === 'typeof' &&
        left.argument.type === 'ReferenceIdentifier') {
        const name = left.argument.name;
        const binding = scope.getBinding(name);
        if (binding !== undefined) {
            const type = new RefineTypeofT_1.default(scope, node, evaluator.getTypeFromEvaluatedNode(right), binding);
            scope.addBinding(name, type);
            return true;
        }
    }
    return false;
}
function BinaryExpression(node, scope) {
    node = js_ast_1.binaryExpression.assert(node);
    const left = scope.evaluate(node.left);
    const right = scope.evaluate(node.right);
    // Enforce that the left and right sides of these operators are numbers
    switch (node.operator) {
        case '<<':
        case '>>':
        case '>>>':
        case '-':
        case '*':
        case '/':
        case '%':
        case '**':
        case '|':
        case '^':
        case '&':
        case '<':
        case '<=':
        case '>':
        case '>=': {
            const num = new NumericT_1.default(scope, undefined);
            new ExhaustiveT_1.default(scope, node, left, num);
            new ExhaustiveT_1.default(scope, node, right, num);
            break;
        }
    }
    // Refinements
    let refinedScope = scope;
    if (node.operator === '===') {
        refinedScope = scope.refine();
        maybeRefine(node, node.left, node.right, refinedScope) ||
            maybeRefine(node, node.right, node.left, refinedScope);
    }
    return new BinaryOpT_1.default(refinedScope, node, left, node.operator, right);
}
exports.default = BinaryExpression;
