"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function isNegation(node) {
    return (node.type === 'UnaryExpression' &&
        node.prefix === true &&
        node.operator === '!');
}
exports.default = {
    name: 'negationElse',
    enter(path) {
        const { node } = path;
        if (node.type === 'IfStatement' &&
            node.alternate !== undefined &&
            isNegation(node.test)) {
            return path.context.addFixableDiagnostic({
                old: node,
                fixed: {
                    ...node,
                    test: node.test.argument,
                    consequent: node.alternate,
                    alternate: node.consequent,
                },
            }, diagnostics_1.descriptions.LINT.NEGATION_ELSE);
        }
        if (node.type === 'ConditionalExpression' && isNegation(node.test)) {
            return path.context.addFixableDiagnostic({
                old: node,
                fixed: {
                    ...node,
                    test: node.test.argument,
                    consequent: node.alternate,
                    alternate: node.consequent,
                },
            }, diagnostics_1.descriptions.LINT.NEGATION_ELSE);
        }
        return node;
    },
};
