"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const bindings_1 = require("../bindings");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    creator: true,
    build(node, parent, parentScope) {
        // We already evaluated ourselves
        if (parentScope.node === node) {
            return parentScope;
        }
        const scope = parentScope.fork('function', parent);
        if (parent.type === 'FunctionExpression') {
            const { id } = parent;
            if (id !== undefined) {
                scope.addBinding(new bindings_1.LetBinding({
                    node: id,
                    name: id.name,
                    scope,
                }));
            }
        }
        // Add type parameters
        scope.evaluate(node.typeParameters, node);
        const params = node.rest === undefined ? node.params : [...node.params, node.rest];
        // Add parameters
        for (const param of params) {
            for (const id of js_ast_utils_1.getBindingIdentifiers(param)) {
                scope.addBinding(new bindings_1.LetBinding({
                    node: id,
                    name: id.name,
                    scope,
                    kind: 'parameter',
                }));
            }
        }
        // Add `arguments` binding
        if (parent.type !== 'ArrowFunctionExpression') {
            scope.addBinding(new bindings_1.ArgumentsBinding({
                name: 'arguments',
                node,
                scope,
            }));
        }
        return scope;
    },
};
