"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function IfStatement(builder, node) {
    const tokens = [
        tokens_1.group(tokens_1.concat([
            'if',
            tokens_1.space,
            '(',
            tokens_1.group(tokens_1.concat([
                tokens_1.indent(tokens_1.concat([tokens_1.softline, builder.tokenize(node.test, node)])),
                tokens_1.softline,
            ])),
            ')',
        ])),
        tokens_1.space,
    ];
    let needsBlock = false;
    if (node.alternate) {
        needsBlock = getLastStatement(node.consequent).type === 'IfStatement';
    }
    if (needsBlock) {
        tokens.push('{', tokens_1.indent(tokens_1.concat([tokens_1.hardline, builder.tokenize(node.consequent, node)])), tokens_1.hardline, '}');
    }
    else {
        tokens.push(builder.tokenize(node.consequent, node));
    }
    if (node.alternate) {
        tokens.push(tokens_1.space, 'else', tokens_1.space, builder.tokenize(node.alternate, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = IfStatement;
// Recursively get the last statement.
function getLastStatement(statement) {
    if ((statement.type === 'WithStatement' ||
        statement.type === 'WhileStatement' ||
        statement.type === 'DoWhileStatement' ||
        statement.type === 'ForOfStatement' ||
        statement.type === 'ForInStatement' ||
        statement.type === 'ForStatement') &&
        js_ast_utils_1.isStatement(statement.body)) {
        return getLastStatement(statement.body);
    }
    else {
        return statement;
    }
}
