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
const utils_1 = require("../utils");
const comments_1 = require("../comments");
function CallExpression(builder, node) {
    const tokens = [builder.tokenize(node.callee, node)];
    if (node.type === 'OptionalCallExpression') {
        tokens.push('?.');
    }
    if (node.typeArguments) {
        tokens.push(builder.tokenize(node.typeArguments, node));
    }
    tokens.push(printArguments(builder, node));
    return tokens_1.concat(tokens);
}
exports.default = CallExpression;
function printArguments(builder, node) {
    if (node.arguments.length === 0) {
        if (comments_1.hasInnerComments(node)) {
            return tokens_1.concat([
                '(',
                builder.tokenizeInnerComments(node, true),
                tokens_1.hardline,
                ')',
            ]);
        }
        else {
            return '()';
        }
    }
    if (node.arguments.length === 1) {
        const argument = node.arguments[0];
        if (argument.type === 'ArrayExpression' ||
            argument.type === 'ObjectExpression' ||
            js_ast_utils_1.isFunctionNode(argument)) {
            return tokens_1.concat(['(', builder.tokenize(argument, node), ')']);
        }
    }
    return tokens_1.group(tokens_1.concat([
        '(',
        tokens_1.indent(tokens_1.concat([tokens_1.softline, utils_1.printCommaList(builder, node.arguments, node)])),
        tokens_1.ifBreak(','),
        tokens_1.softline,
        ')',
    ]));
}
