"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ArrowFunctionExpression(builder, node) {
    const tokens = [];
    if (node.head.async === true) {
        tokens.push('async');
        tokens.push(tokens_1.space);
    }
    tokens.push(builder.tokenize(node.head, node));
    tokens.push(tokens_1.space, '=>');
    const body = builder.tokenize(node.body, node);
    // Keep these types of node on the line as the arrow
    if (node.body.type === 'ArrayExpression' ||
        node.body.type === 'ObjectExpression' ||
        node.body.type === 'BlockStatement' ||
        node.body.type === 'ArrowFunctionExpression') {
        return tokens_1.group(tokens_1.concat([tokens_1.concat(tokens), tokens_1.space, body]));
    }
    if (node.body.type === 'SequenceExpression') {
        return tokens_1.concat([
            tokens_1.concat(tokens),
            tokens_1.group(tokens_1.concat([tokens_1.space, '(', tokens_1.indent(tokens_1.concat([tokens_1.softline, body])), tokens_1.softline, ')'])),
        ]);
    }
    return tokens_1.group(tokens_1.concat([
        tokens_1.concat(tokens),
        tokens_1.group(tokens_1.concat([tokens_1.indent(tokens_1.concat([tokens_1.lineOrSpace, body])), tokens_1.softline])),
    ]));
}
exports.default = ArrowFunctionExpression;
