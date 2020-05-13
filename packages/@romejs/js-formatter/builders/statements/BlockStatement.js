"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function BlockStatement(builder, node, parent) {
    const hasComments = node.innerComments !== undefined && node.innerComments.length > 0;
    const hasContents = node.body !== undefined && node.body.length > 0;
    const hasDirectives = node.directives !== undefined && node.directives.length > 0;
    if (!hasComments &&
        !hasContents &&
        !hasDirectives &&
        (parent.type === 'ArrowFunctionExpression' ||
            parent.type === 'ClassMethod' ||
            parent.type === 'ClassPrivateMethod' ||
            parent.type === 'DoWhileStatement' ||
            parent.type === 'ForInStatement' ||
            parent.type === 'ForOfStatement' ||
            parent.type === 'ForStatement' ||
            parent.type === 'FunctionDeclaration' ||
            parent.type === 'FunctionExpression' ||
            parent.type === 'ObjectMethod' ||
            parent.type === 'SwitchStatement' ||
            parent.type === 'WhileStatement')) {
        return '{}';
    }
    const tokens = ['{'];
    if (hasDirectives) {
        for (const directive of node.directives) {
            tokens.push(tokens_1.indent(tokens_1.concat([tokens_1.hardline, builder.tokenize(directive, node)])));
        }
    }
    if (hasContents) {
        tokens.push(tokens_1.indent(tokens_1.concat([tokens_1.hardline, builder.tokenizeStatementList(node.body, node)])));
    }
    if (hasComments) {
        tokens.push(builder.tokenizeInnerComments(node, true));
    }
    tokens.push(tokens_1.hardline, '}');
    return tokens_1.concat(tokens);
}
exports.default = BlockStatement;
