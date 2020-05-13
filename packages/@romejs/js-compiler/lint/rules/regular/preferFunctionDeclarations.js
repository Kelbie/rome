"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
// This hook is created with a list of initial VariableDeclarators that contain functions we want to convert
// We then remove any ArrowFunctionExpression VariableDeclarators that contain a valid ThisExpression
const hook = js_compiler_1.createHook({
    name: 'preferFunctionDeclarationsHook',
    initialState: {
        declarators: [],
    },
    call(path, state, { declarator, node }) {
        return {
            bubble: !state.declarators.includes(declarator),
            value: node,
            state: {
                declarators: state.declarators.filter((decl) => decl !== declarator),
            },
        };
    },
    exit(path, state) {
        const node = js_ast_1.variableDeclarationStatement.assert(path.node);
        // We may have invalidated all declarations
        if (state.declarators.length === 0) {
            return node;
        }
        const nodes = [];
        const newNode = {
            ...node,
            declaration: {
                ...node.declaration,
                declarations: node.declaration.declarations.filter((decl) => !state.declarators.includes(decl)),
            },
        };
        // We may have removed all the declarators
        if (newNode.declaration.declarations.length > 0) {
            nodes.push(newNode);
        }
        // Convert functions
        for (const decl of state.declarators) {
            const id = js_ast_1.bindingIdentifier.assert(decl.id);
            const { init } = decl;
            if (init === undefined ||
                (init.type !== 'FunctionExpression' &&
                    init.type !== 'ArrowFunctionExpression')) {
                throw new Error('Invalid declarator put into state');
            }
            // TODO if this is suppressed then don't transform
            path.context.addNodeDiagnostic(init, diagnostics_1.descriptions.LINT.PREFER_FUNCTION_DECLARATIONS, { fixable: true });
            // Convert arrow function body if necessary
            const body = init.body.type === 'BlockStatement'
                ? init.body
                : js_ast_1.blockStatement.create({
                    body: [js_ast_1.returnStatement.quick(init.body)],
                });
            nodes.push(js_ast_1.functionDeclaration.create({
                id,
                head: init.head,
                body,
            }));
        }
        return nodes;
    },
});
exports.default = {
    name: 'preferFunctionDeclarations',
    enter(path) {
        const { node } = path;
        if (node.type === 'VariableDeclarationStatement' &&
            node.declaration.kind === 'const') {
            // Get all declarators that are function expressions, have no type annotation, and have a binding identifier id
            const declarators = node.declaration.declarations.filter((decl) => {
                return (decl.id.type === 'BindingIdentifier' &&
                    (decl.id.meta === undefined ||
                        decl.id.meta.typeAnnotation === undefined) &&
                    decl.init !== undefined &&
                    (decl.init.type === 'FunctionExpression' ||
                        decl.init.type === 'ArrowFunctionExpression'));
            });
            if (declarators.length > 0) {
                return path.provideHook(hook, {
                    declarators,
                });
            }
        }
        // If we have a `this` inside of an arrow function attached as a variable declarator then we should consider
        // it valid
        if (node.type === 'ThisExpression') {
            // Try to find the arrow function owner, or stop if we get to another function
            const func = path.findAncestry((path) => {
                if (path.node.type === 'ArrowFunctionExpression') {
                    return path.parent.type === 'VariableDeclarator';
                }
                if (js_ast_utils_1.isFunctionNode(path.node)) {
                    return true;
                }
                return false;
            });
            // We'll only return an ArrowFunctionExpression if it was inside of a VariableDeclarator
            if (func !== undefined && func.node.type === 'ArrowFunctionExpression') {
                return path.callHook(hook, {
                    declarator: js_ast_1.variableDeclarator.assert(func.parent),
                    node,
                }, node);
            }
        }
        return node;
    },
};
