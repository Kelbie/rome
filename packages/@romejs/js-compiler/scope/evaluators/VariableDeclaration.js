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
exports.default = {
    creator: false,
    build(node, parent, scope) {
        for (const decl of node.declarations) {
            for (const id of js_ast_utils_1.getBindingIdentifiers(decl)) {
                if (node.kind === 'let') {
                    scope.addBinding(new js_compiler_1.LetBinding({
                        node: id,
                        name: id.name,
                        scope,
                    }));
                }
                if (node.kind === 'const') {
                    // Only set the value for simple declarations
                    let valueNode = id === decl.id ? decl.init : undefined;
                    scope.addBinding(new js_compiler_1.ConstBinding({
                        node: id,
                        name: id.name,
                        scope,
                    }, valueNode));
                }
                if (node.kind === 'var' &&
                    (scope.kind === 'program' || scope.kind === 'function')) {
                    if (!scope.hasHoistedVars) {
                        throw new Error('This scope does not allow `var`iables. This is probably because `var`iables were injected into a scope that did not contain `var` in the original source.' +
                            scope.kind);
                    }
                    scope.addBinding(new js_compiler_1.VarBinding({
                        node: id,
                        name: id.name,
                        scope,
                    }));
                }
            }
        }
    },
};
