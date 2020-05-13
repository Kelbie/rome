"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function isBooleanConstructorCall(node) {
    return (node.type === 'NewExpression' &&
        node.callee.type === 'ReferenceIdentifier' &&
        node.callee.name === 'Boolean');
}
function isConditionalStatement(node) {
    return node.type === 'ConditionalExpression';
}
function isInBooleanContext(node) {
    return (node.type === 'IfStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'WhileStatement' ||
        node.type === 'ForStatement');
}
function getNode(path) {
    let { node } = path;
    if (isBooleanConstructorCall(node)) {
        if (node.type === 'NewExpression' && node.arguments.length > 0) {
            return node.arguments[0];
        }
    }
    if (isInBooleanContext(node) || isConditionalStatement(node)) {
        return node.test;
    }
    return undefined;
}
exports.default = {
    name: 'noExtraBooleanCast',
    enter(path) {
        const { context } = path;
        let node = getNode(path);
        if (node !== undefined) {
            if ((node.type === 'UnaryExpression' &&
                node.operator === '!' &&
                node.argument.type === 'UnaryExpression' &&
                node.argument.operator === '!') ||
                (node.type === 'CallExpression' &&
                    node.callee.type === 'ReferenceIdentifier' &&
                    node.callee.name === 'Boolean')) {
                context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_EXTRA_BOOLEAN_CAST);
            }
        }
        return path.node;
    },
};
