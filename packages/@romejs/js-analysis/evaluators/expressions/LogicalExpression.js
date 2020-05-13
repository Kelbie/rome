"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const UnionT_1 = require("../../types/UnionT");
function uniq(args) {
    return [...new Set(args)];
}
function LogicalExpression(node, scope) {
    node = js_ast_1.logicalExpression.assert(node);
    switch (node.operator) {
        case '||': {
            const left = scope.refine().evaluate(node.left);
            const right = scope.refine().evaluate(node.right);
            // create a new scope that has unions of all the refined bindings
            const refinedScope = scope.refine();
            const refinedNames = uniq([
                ...left.scope.getOwnBindingNames(),
                ...right.scope.getOwnBindingNames(),
            ]);
            const mergeScopes = [left.scope, right.scope];
            for (const name of refinedNames) {
                const rawTypes = new Set();
                for (const scope of mergeScopes) {
                    const binding = scope.getBinding(name);
                    if (binding !== undefined) {
                        rawTypes.add(binding);
                    }
                }
                const types = Array.from(rawTypes);
                refinedScope.addBinding(name, refinedScope.createUnion(types));
            }
            return new UnionT_1.default(refinedScope, node, [left, right]);
        }
        case '&&': {
            const left = scope.evaluate(node.left);
            const right = left.scope.evaluate(node.right);
            return new UnionT_1.default(right.scope, node, [left, right]);
        }
        default:
            throw new Error('Unknown operator');
    }
}
exports.default = LogicalExpression;
