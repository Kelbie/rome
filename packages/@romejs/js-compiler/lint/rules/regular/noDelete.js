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
    name: 'noDelete',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'UnaryExpression' &&
            node.operator === 'delete' &&
            node.argument.type === 'MemberExpression') {
            const left = node.argument;
            return context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.assignmentExpression.create({
                    operator: '=',
                    left: js_ast_1.memberExpression.create({
                        object: left.object,
                        property: left.property,
                    }),
                    right: js_ast_1.referenceIdentifier.create({
                        name: 'undefined',
                    }),
                }, node),
            }, diagnostics_1.descriptions.LINT.NO_DELETE);
        }
        return node;
    },
};
