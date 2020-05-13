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
    name: 'unsafeNegation',
    enter(path) {
        const { node } = path;
        if (node.type === 'BinaryExpression' &&
            (node.operator === 'in' || node.operator === 'instanceof') &&
            node.left.type === 'UnaryExpression' &&
            node.left.operator === '!') {
            return path.context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.unaryExpression.create({
                    operator: node.left.operator,
                    argument: {
                        ...node,
                        left: node.left.argument,
                    },
                }),
            }, diagnostics_1.descriptions.LINT.UNSAFE_NEGATION);
        }
        return node;
    },
};
