"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function isInsideArrow(path) {
    for (const ancestor of path.ancestryPaths) {
        const { type } = ancestor.node;
        // If we hit a function first then it takes precedence over any arrow
        // NOTE: There are other nodes for functions not included
        if (type === 'FunctionExpression' || type === 'FunctionDeclaration') {
            return false;
        }
        if (type === 'ArrowFunctionExpression') {
            return true;
        }
    }
    return false;
}
const arrowProvider = js_compiler_1.createHook({
    name: 'arrowProvider',
    initialState: {
        id: undefined,
    },
    call(path, state, node) {
        const id = state.id === undefined ? path.scope.generateUid() : state.id;
        return {
            value: js_ast_1.identifier.create({
                name: id,
                loc: js_ast_utils_1.inheritLoc(node, 'this'),
            }),
            state: {
                id,
            },
        };
    },
    exit(path, state) {
        const { node } = path;
        if (node.type !== 'FunctionDeclaration' &&
            node.type !== 'FunctionExpression') {
            throw new Error('Only ever expected function nodes');
        }
        // This is called after the subtree has been transformed
        if (state.id === undefined) {
            // No `ThisExpression`s were rewritten
            return node;
        }
        else {
            return {
                // Inject the binding into the function block
                ...node,
                body: {
                    ...node.body,
                    body: [
                        js_ast_1.variableDeclarationStatement.quick(js_ast_1.variableDeclaration.create({
                            kind: 'const',
                            declarations: [
                                js_ast_1.variableDeclarator.create({
                                    id: js_ast_1.bindingIdentifier.quick(state.id),
                                    init: js_ast_1.thisExpression.create({}),
                                }),
                            ],
                        })),
                        ...node.body.body,
                    ],
                },
            };
        }
    },
});
exports.default = {
    name: 'arrowFunctions',
    enter(path) {
        const { node } = path;
        if (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression') {
            // Add a provider to consume `this` inside of arrow functions
            return path.provideHook(arrowProvider);
        }
        if (node.type === 'ThisExpression' && isInsideArrow(path)) {
            // If we're a this expression and we're inside of an arrow then consume us by a descendent provider
            return path.callHook(arrowProvider, node);
        }
        return node;
    },
    exit(path) {
        const { node } = path;
        if (node.type === 'ArrowFunctionExpression') {
            return {
                // Convert all arrow functions into normal functions, we do this in the `exit` method because we
                // still need the arrow to be in the tree for the `isInsideArrow` call in `enter to work
                ...node,
                type: 'FunctionExpression',
            };
        }
        return node;
    },
};
