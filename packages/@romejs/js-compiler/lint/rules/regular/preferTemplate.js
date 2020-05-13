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
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    name: 'preferTemplate',
    enter(path) {
        const { node } = path;
        if (node.type === 'BinaryExpression' &&
            node.operator === '+' &&
            ((node.left.type === 'StringLiteral' && !node.left.value.includes('`')) ||
                (node.right.type === 'StringLiteral' && !node.right.value.includes('`')))) {
            let autofix;
            if (node.right.type === 'StringLiteral') {
                const quasis = [
                    js_ast_1.templateElement.create({
                        raw: '',
                        cooked: '',
                    }),
                    js_ast_1.templateElement.create({
                        raw: node.right.value,
                        cooked: node.right.value,
                    }),
                ];
                const expressions = [js_ast_utils_1.removeShallowLoc(node.left)];
                autofix = js_ast_1.templateLiteral.create({
                    expressions,
                    quasis,
                    loc: node.loc,
                });
            }
            if (node.left.type === 'StringLiteral') {
                const quasis = [
                    js_ast_1.templateElement.create({
                        raw: node.left.value,
                        cooked: node.left.value,
                    }),
                    js_ast_1.templateElement.create({
                        raw: '',
                        cooked: '',
                    }),
                ];
                // We need to remove the location or else if we were to show a preview the source map would resolve to the end of
                // this node
                const expressions = [js_ast_utils_1.removeShallowLoc(node.right)];
                autofix = js_ast_1.templateLiteral.create({
                    expressions,
                    quasis,
                    loc: node.loc,
                });
            }
            if (autofix === undefined) {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.PREFER_TEMPLATE);
            }
            else {
                return path.context.addFixableDiagnostic({
                    old: node,
                    fixed: autofix,
                }, diagnostics_1.descriptions.LINT.PREFER_TEMPLATE);
            }
        }
        return node;
    },
};
