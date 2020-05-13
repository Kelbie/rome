"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const tokens_1 = require("../tokens");
const comments_1 = require("./comments");
function buildLabelStatementBuilder(prefix) {
    return (builder, node) => {
        const tokens = [prefix];
        if (node.label) {
            tokens.push(tokens_1.space, builder.tokenize(node.label, node));
        }
        tokens.push(';');
        return tokens_1.concat(tokens);
    };
}
exports.buildLabelStatementBuilder = buildLabelStatementBuilder;
function buildThrowAndReturnStatementBuilder(prefix) {
    return (builder, node) => {
        const tokens = [prefix];
        if (node.argument) {
            tokens.push(tokens_1.space);
            if (node.argument.type === 'BinaryExpression' ||
                node.argument.type === 'LogicalExpression' ||
                node.argument.type === 'SequenceExpression') {
                tokens.push(tokens_1.group(tokens_1.concat([
                    tokens_1.ifBreak('('),
                    tokens_1.indent(tokens_1.concat([tokens_1.softline, builder.tokenize(node.argument, node)])),
                    tokens_1.softline,
                    tokens_1.ifBreak(')'),
                ])));
            }
            else {
                tokens.push(builder.tokenize(node.argument, node));
            }
        }
        tokens.push(';');
        return tokens_1.concat(tokens);
    };
}
exports.buildThrowAndReturnStatementBuilder = buildThrowAndReturnStatementBuilder;
function printMethod(builder, node) {
    const kind = node.kind;
    const tokens = [];
    if (kind === 'method' && node.head.generator === true) {
        tokens.push('*');
    }
    if (kind === 'get' || kind === 'set') {
        tokens.push(kind);
        tokens.push(tokens_1.space);
    }
    if (node.head.async === true) {
        tokens.push('async');
        tokens.push(tokens_1.space);
    }
    if (node.type === 'TSDeclareMethod') {
        return tokens_1.concat([tokens_1.concat(tokens), builder.tokenize(node.head, node)]);
    }
    return tokens_1.concat([
        tokens_1.concat(tokens),
        builder.tokenize(node.key, node),
        builder.tokenize(node.head, node),
        tokens_1.space,
        builder.tokenize(node.body, node),
    ]);
}
exports.printMethod = printMethod;
function printBindingPatternParams(builder, node, params, rest) {
    if (params.length === 0 && rest === undefined) {
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
    const tokens = [
        tokens_1.softline,
        tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), params.map((param) => builder.tokenize(param, node))),
    ];
    if (rest) {
        if (params.length > 0) {
            tokens.push(',', tokens_1.lineOrSpace);
        }
        tokens.push('...', builder.tokenize(rest, node));
    }
    if (params.length > 0 && !rest) {
        tokens.push(tokens_1.ifBreak(','));
    }
    return tokens_1.concat(['(', tokens_1.indent(tokens_1.concat(tokens)), tokens_1.softline, ')']);
}
exports.printBindingPatternParams = printBindingPatternParams;
function printTSBraced(builder, node, members) {
    if (members.length === 0) {
        return tokens_1.group(tokens_1.concat(['{', builder.tokenizeInnerComments(node, true), tokens_1.softline, '}']));
    }
    return tokens_1.group(tokens_1.concat([
        '{',
        tokens_1.indent(tokens_1.concat([
            tokens_1.hardline,
            tokens_1.join(tokens_1.hardline, members.map((member, index) => {
                const printed = builder.tokenize(member, node);
                if (index > 0 &&
                    builder.getLinesBetween(members[index - 1], member) > 1) {
                    return tokens_1.concat([tokens_1.hardline, printed]);
                }
                else {
                    return printed;
                }
            })),
        ])),
        tokens_1.hardline,
        '}',
    ]), true);
}
exports.printTSBraced = printTSBraced;
function printPatternMeta(builder, node, meta) {
    if (builder.options.typeAnnotations && meta !== undefined) {
        const tokens = [];
        if (meta.optional) {
            tokens.push('?');
        }
        if (meta.typeAnnotation) {
            tokens.push(':', tokens_1.space, builder.tokenize(meta.typeAnnotation, node));
        }
        return tokens_1.concat(tokens);
    }
    else {
        return '';
    }
}
exports.printPatternMeta = printPatternMeta;
function printClause(builder, clause, parent) {
    if (clause.type === 'EmptyStatement') {
        return ';';
    }
    if (clause.type === 'BlockStatement') {
        return tokens_1.concat([tokens_1.space, builder.tokenize(clause, parent)]);
    }
    return tokens_1.indent(tokens_1.concat([tokens_1.lineOrSpace, builder.tokenize(clause, parent)]));
}
exports.printClause = printClause;
function printCommaList(builder, nodes, parent) {
    return tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), nodes.map((node) => builder.tokenize(node, parent)));
}
exports.printCommaList = printCommaList;
function printAssignment(builder, node, left, operator, right) {
    const canBreak = right.type === 'BinaryExpression' ||
        right.type === 'LogicalExpression' ||
        right.type === 'SequenceExpression' ||
        (right.type === 'ConditionalExpression' && js_ast_utils_1.isBinary(right.test));
    return tokens_1.group(tokens_1.concat([
        builder.tokenize(left, node),
        operator,
        canBreak
            ? tokens_1.group(tokens_1.indent(tokens_1.concat([tokens_1.lineOrSpace, builder.tokenize(right, node)])))
            : tokens_1.concat([tokens_1.space, builder.tokenize(right, node)]),
    ]));
}
exports.printAssignment = printAssignment;
