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
const comments_1 = require("../comments");
const utils_1 = require("../utils");
function ExportLocalDeclaration(builder, node) {
    if (node.exportKind === 'type' && !builder.options.typeAnnotations) {
        return '';
    }
    return tokens_1.concat(['export', tokens_1.space, printExportDeclaration(builder, node)]);
}
exports.default = ExportLocalDeclaration;
function printExportDeclaration(builder, node) {
    if (node.declaration) {
        const tokens = [builder.tokenize(node.declaration, node)];
        if (!js_ast_utils_1.isDeclaration(node.declaration)) {
            tokens.push(';');
        }
        return tokens_1.concat(tokens);
    }
    else {
        if (node.type !== 'ExportLocalDeclaration') {
            throw new Error('Expected ExportLocalDeclaration');
        }
        const { specifiers } = node;
        if (specifiers === undefined) {
            throw new Error('Expected specifiers since there was no declaration');
        }
        const tokens = [];
        if (node.exportKind === 'type') {
            tokens.push('type', tokens_1.space);
        }
        if (specifiers.length === 0) {
            if (comments_1.hasInnerComments(node)) {
                tokens.push(tokens_1.concat(['{', builder.tokenizeInnerComments(node, true), tokens_1.hardline, '}']));
            }
            else {
                tokens.push('{}');
            }
        }
        else {
            tokens.push(tokens_1.group(tokens_1.concat([
                '{',
                tokens_1.indent(tokens_1.concat([tokens_1.softline, utils_1.printCommaList(builder, specifiers, node)])),
                tokens_1.ifBreak(','),
                tokens_1.softline,
                '}',
            ])));
        }
        tokens.push(';');
        return tokens_1.concat(tokens);
    }
}
exports.printExportDeclaration = printExportDeclaration;
