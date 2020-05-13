"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function addFunctionBindings(scope, node, hasArguments = true) {
    const { head } = node;
    // Add type parameters
    scope.evaluate(head.typeParameters);
    const params = head.rest === undefined ? head.params : [...head.params, head.rest];
    // Add parameters
    for (const param of params) {
        for (const id of js_ast_utils_1.getBindingIdentifiers(param)) {
            // TODO maybe add a `param` binding type?
            scope.addBinding(new js_compiler_1.LetBinding({
                node: id,
                name: id.name,
                scope,
                kind: 'parameter',
            }));
        }
    }
    // Add `arguments` binding
    if (hasArguments) {
        scope.addBinding(new js_compiler_1.ArgumentsBinding({
            name: 'arguments',
            node,
            scope,
        }));
    }
    if (head.hasHoistedVars) {
        addVarBindings(scope, node);
    }
}
exports.addFunctionBindings = addFunctionBindings;
function addVarBindings(scope, topNode) {
    const { context } = scope.getRootScope();
    scope.setHoistedVars();
    context.reduce(topNode, [
        {
            name: 'scopeVarFunc',
            enter: (path) => {
                const { node, parent } = path;
                if (js_ast_utils_1.isFunctionNode(node) && node !== topNode) {
                    return js_compiler_1.REDUCE_SKIP_SUBTREE;
                }
                if (node.type === 'VariableDeclaration' && node.kind === 'var') {
                    scope.evaluate(node, parent);
                }
                return node;
            },
        },
    ], {
        scope,
        noScopeCreation: true,
    });
}
exports.addVarBindings = addVarBindings;
