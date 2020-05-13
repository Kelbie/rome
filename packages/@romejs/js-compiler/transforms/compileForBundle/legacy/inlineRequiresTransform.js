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
const NON_INLINED_REQUIRES = [];
exports.default = {
    name: 'inlineRequiresTransform',
    enter(path) {
        const { node } = path;
        if (node.type === 'ReferenceIdentifier') {
            const binding = path.scope.getBinding(node.name);
            // Inline references to a require variable
            if (binding !== undefined && binding instanceof js_compiler_1.ConstBinding) {
                const source = js_ast_utils_1.getRequireSource(binding.value, path.scope, true);
                if (source !== undefined &&
                    !NON_INLINED_REQUIRES.includes(source) &&
                    !js_ast_utils_1.isInTypeAnnotation(path) &&
                    binding.value !== undefined) {
                    return binding.value;
                }
            }
        }
        return node;
    },
    exit(path) {
        const { node } = path;
        if (node.type === 'Program' || node.type === 'BlockStatement') {
            const body = [];
            let hadRequires = false;
            // Remove all require declarations that could have been inlined
            for (const bodyNode of node.body) {
                if (bodyNode.type === 'VariableDeclarationStatement' &&
                    bodyNode.declaration.kind === 'const') {
                    let hadRequireDeclarators = false;
                    const declarators = [];
                    for (const decl of bodyNode.declaration.declarations) {
                        if (decl.id.type !== 'BindingIdentifier') {
                            // Patterns aren't supported yet
                            declarators.push(decl);
                            continue;
                        }
                        const source = js_ast_utils_1.getRequireSource(decl.init, path.scope, true);
                        if (source === undefined) {
                            // Didn't contain a `require`
                            declarators.push(decl);
                            continue;
                        }
                        if (NON_INLINED_REQUIRES.includes(source)) {
                            // Blacklisted
                            declarators.push(decl);
                            continue;
                        }
                        hadRequireDeclarators = true;
                        hadRequires = true;
                    }
                    if (hadRequireDeclarators) {
                        if (declarators.length > 0) {
                            body.push({
                                ...bodyNode,
                                declaration: {
                                    ...bodyNode.declaration,
                                    declarations: declarators,
                                },
                            });
                        }
                        continue;
                    }
                }
                body.push(bodyNode);
            }
            if (!hadRequires) {
                return node;
            }
            return {
                ...node,
                body,
            };
        }
        return node;
    },
};
