"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'singleVarDeclarator',
    enter(path) {
        const { node } = path;
        if (node.type === 'VariableDeclarationStatement' &&
            node.declaration.declarations.length > 1) {
            const fixed = [];
            const { kind } = node.declaration;
            for (const declarator of node.declaration.declarations) {
                fixed.push(js_ast_1.variableDeclarationStatement.quick(js_ast_1.variableDeclaration.create({
                    kind,
                    declarations: [declarator],
                })));
            }
            return path.context.addFixableDiagnostic({ old: node, fixed }, diagnostics_1.descriptions.LINT.SINGLE_VAR_DECLARATOR);
        }
        return node;
    },
};
