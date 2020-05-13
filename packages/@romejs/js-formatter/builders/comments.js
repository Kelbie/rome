"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("../node");
const tokens_1 = require("../tokens");
function hasInnerComments(node) {
    return node.innerComments !== undefined && node.innerComments.length > 0;
}
exports.hasInnerComments = hasInnerComments;
function printComment(node) {
    switch (node.type) {
        case 'CommentBlock': {
            const lines = node.value.split('\n');
            if (lines.every((line) => line.trimStart().charAt(0) === '*')) {
                return tokens_1.comment(tokens_1.concat([
                    '/*',
                    tokens_1.join(tokens_1.hardline, lines.map((line, index) => index === 0
                        ? line.trimEnd()
                        : ` ${index < lines.length - 1
                            ? line.trim()
                            : line.trimStart()}`)),
                    '*/',
                ]));
            }
            else {
                return tokens_1.comment(`/*${node.value}*/`);
            }
        }
        case 'CommentLine': {
            return tokens_1.comment(`//${node.value.trimEnd()}`);
        }
    }
}
exports.printComment = printComment;
function printCommentSeparator(left, right) {
    const linesBetween = node_1.getLinesBetween(left, right);
    return linesBetween === 0
        ? tokens_1.space
        : linesBetween === 1
            ? tokens_1.hardline
            : tokens_1.concat([tokens_1.hardline, tokens_1.hardline]);
}
function printLeadingComment(node, next) {
    const comment = printComment(node);
    if (node.type === 'CommentLine') {
        return tokens_1.concat([comment, tokens_1.hardline]);
    }
    else {
        return tokens_1.concat([comment, printCommentSeparator(node, next)]);
    }
}
exports.printLeadingComment = printLeadingComment;
function printTrailingComment(node, previous) {
    const comment = printComment(node);
    const linesBetween = node_1.getLinesBetween(previous, node);
    if (linesBetween >= 1) {
        return tokens_1.lineSuffix(tokens_1.concat([linesBetween > 1 ? tokens_1.hardline : '', tokens_1.hardline, comment]));
    }
    else {
        if (node.type === 'CommentBlock') {
            return tokens_1.ifBreak(tokens_1.lineSuffix(tokens_1.concat([tokens_1.space, comment])), tokens_1.concat([tokens_1.space, comment]));
        }
        else {
            return tokens_1.lineSuffix(tokens_1.concat([tokens_1.space, comment]));
        }
    }
}
exports.printTrailingComment = printTrailingComment;
