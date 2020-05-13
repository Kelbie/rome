"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const tokens_1 = require("../../tokens");
function BinaryExpression(builder, node, parent) {
    const shouldNotGroup = (parent.type === 'IfStatement' && parent.test === node) ||
        (parent.type === 'DoWhileStatement' && parent.test === node) ||
        (parent.type === 'WhileStatement' && parent.test === node) ||
        (parent.type === 'SwitchStatement' && parent.discriminant === node);
    const parts = printBinaryExpression(builder, node, parent, shouldNotGroup);
    if (shouldNotGroup) {
        return tokens_1.concat(parts);
    }
    return tokens_1.group(tokens_1.concat(parts));
}
exports.default = BinaryExpression;
function printBinaryExpression(builder, node, parent, shouldNotGroup) {
    const parts = [];
    if (js_ast_utils_1.isBinary(node.left) &&
        js_ast_utils_1.getPrecedence(node.operator) === js_ast_utils_1.getPrecedence(node.left.operator)) {
        parts.push(...printBinaryExpression(builder, node.left, node, shouldNotGroup));
    }
    else {
        parts.push(builder.tokenize(node.left, node));
    }
    // Inline object and array expressions:
    //   obj && {
    //   arr ?? [
    const shouldInline = node.type === 'LogicalExpression' &&
        (node.right.type === 'ArrayExpression' ||
            node.right.type === 'ObjectExpression');
    const right = tokens_1.concat([
        node.operator,
        shouldInline ? tokens_1.space : tokens_1.lineOrSpace,
        builder.tokenize(node.right, node),
    ]);
    const shouldGroup = !shouldNotGroup &&
        node.type !== parent.type &&
        node.type !== node.left.type &&
        node.type !== node.right.type;
    parts.push(tokens_1.concat([tokens_1.space, shouldGroup ? tokens_1.group(right) : right]));
    return parts;
}
