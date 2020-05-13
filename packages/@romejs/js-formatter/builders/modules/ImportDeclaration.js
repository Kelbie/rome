"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ImportDeclaration(builder, node) {
    const tokens = ['import', tokens_1.space];
    if (node.importKind === 'type' || node.importKind === 'typeof') {
        tokens.push(node.importKind);
        tokens.push(tokens_1.space);
    }
    const { namedSpecifiers, defaultSpecifier, namespaceSpecifier } = node;
    if (namedSpecifiers.length > 0 ||
        namespaceSpecifier !== undefined ||
        defaultSpecifier !== undefined) {
        tokens.push(printModuleSpecifiers(builder, node), tokens_1.space, 'from', tokens_1.space);
    }
    tokens.push(builder.tokenize(node.source, node), ';');
    return tokens_1.group(tokens_1.concat(tokens));
}
exports.default = ImportDeclaration;
function printModuleSpecifiers(builder, node) {
    const { namedSpecifiers, defaultSpecifier, namespaceSpecifier } = node;
    const groups = [];
    if (defaultSpecifier !== undefined) {
        groups.push(builder.tokenize(node.defaultSpecifier, node));
    }
    if (namespaceSpecifier !== undefined) {
        groups.push(builder.tokenize(node.namespaceSpecifier, node));
    }
    if (namedSpecifiers.length > 0) {
        const specifiers = [];
        for (const specifier of namedSpecifiers) {
            specifiers.push(builder.tokenize(specifier, node));
        }
        if (specifiers.length === 1) {
            // Do not create insert softline tokens when there is a single specifier
            // in order to keep the braces on the same line.
            groups.push(tokens_1.concat(['{', specifiers[0], '}']));
        }
        else {
            groups.push(tokens_1.concat([
                '{',
                tokens_1.indent(tokens_1.concat([tokens_1.softline, tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), specifiers)])),
                tokens_1.ifBreak(','),
                tokens_1.softline,
                '}',
            ]));
        }
    }
    return tokens_1.join(tokens_1.concat([',', tokens_1.space]), groups);
}
exports.printModuleSpecifiers = printModuleSpecifiers;
