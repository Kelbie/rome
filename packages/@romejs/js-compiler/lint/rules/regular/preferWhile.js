"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'preferWhile',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'ForStatement' &&
            node.init === undefined &&
            node.update === undefined) {
            return context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.whileStatement.create({
                    test: node.test !== undefined
                        ? node.test
                        : js_ast_1.booleanLiteral.quick(true),
                    body: node.body,
                    leadingComments: node.leadingComments,
                    trailingComments: node.trailingComments,
                }, node),
            }, diagnostics_1.descriptions.LINT.PREFER_WHILE);
        }
        return node;
    },
};
