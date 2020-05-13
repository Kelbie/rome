"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const CommentsConsumer_1 = require("@romejs/js-parser/CommentsConsumer");
const comments_1 = require("./builders/comments");
const index_1 = require("./builders/index");
const n = require("./node/index");
const tokens_1 = require("./tokens");
const ob1_1 = require("@romejs/ob1");
class Builder {
    constructor(opts, comments = []) {
        this.options = opts;
        this.comments = new CommentsConsumer_1.default(comments);
        this.printedComments = new Set();
        this.printStack = [];
    }
    tokenize(node, parent) {
        if (node === undefined) {
            return '';
        }
        if (!this.options.typeAnnotations &&
            js_ast_utils_1.isTypeNode(node) &&
            !js_ast_utils_1.isTypeExpressionWrapperNode(node)) {
            return '';
        }
        const tokenizeNode = index_1.default.get(node.type);
        if (tokenizeNode === undefined) {
            throw new Error(`No known builder for node ${node.type} with parent ${parent.type}`);
        }
        this.printStack.push(node);
        let printedNode = tokenizeNode(this, node, parent);
        const needsParens = n.needsParens(node, parent, this.printStack);
        this.printStack.pop();
        if (printedNode !== '') {
            if (this.options.sourceMaps && node.loc !== undefined) {
                printedNode = tokens_1.concat([
                    tokens_1.mark(node.loc, 'start'),
                    printedNode,
                    tokens_1.mark(node.loc, 'end'),
                ]);
            }
            if (needsParens) {
                printedNode = tokens_1.concat(['(', printedNode, ')']);
            }
        }
        return this.tokenizeComments(node, printedNode);
    }
    tokenizeComments(node, printed) {
        const tokens = [];
        const leadingComments = this.getComments('leadingComments', node);
        if (leadingComments !== undefined) {
            let next = node;
            // Leading comments are traversed backward in order to get `next` right
            for (let i = leadingComments.length - 1; i >= 0; i--) {
                const comment = leadingComments[i];
                this.printedComments.add(comment.id);
                tokens.unshift(comments_1.printLeadingComment(comment, next));
                next = comment;
            }
        }
        tokens.push(printed);
        const trailingComments = this.getComments('trailingComments', node);
        if (trailingComments !== undefined) {
            let previous = node;
            for (const comment of trailingComments) {
                this.printedComments.add(comment.id);
                tokens.push(comments_1.printTrailingComment(comment, previous));
                previous = comment;
            }
        }
        return tokens_1.concat(tokens);
    }
    tokenizeStatementList(nodes, parent) {
        if (nodes.length === 0) {
            return '';
        }
        const tokens = [];
        for (let i = 0; i < nodes.length; i++) {
            const isLast = i === nodes.length - 1;
            const node = nodes[i];
            if (node.type === 'EmptyStatement') {
                continue;
            }
            let printed = this.tokenize(node, parent);
            if (!isLast) {
                const nextNode = nodes[i + 1];
                if (this.getLinesBetween(node, nextNode) > 1) {
                    printed = tokens_1.concat([printed, tokens_1.hardline]);
                }
            }
            tokens.push(printed);
        }
        return tokens_1.join(tokens_1.hardline, tokens);
    }
    tokenizeInnerComments(node, shouldIndent) {
        const innerComments = this.getComments('innerComments', node);
        if (innerComments === undefined) {
            return '';
        }
        const tokens = [];
        for (const comment of innerComments) {
            this.printedComments.add(comment.id);
            tokens.push(comments_1.printComment(comment));
        }
        return shouldIndent
            ? tokens_1.indent(tokens_1.concat([tokens_1.hardline, tokens_1.join(tokens_1.hardline, tokens)]))
            : tokens_1.join(tokens_1.hardline, tokens);
    }
    getComments(kind, node, all = false) {
        if (!node) {
            return undefined;
        }
        const ids = node[kind];
        if (ids === undefined) {
            return undefined;
        }
        const comments = this.comments.getCommentsFromIds(ids);
        if (all) {
            return comments;
        }
        else {
            return comments.filter((comment) => !this.printedComments.has(comment.id));
        }
    }
    getLinesBetween(a, b) {
        if (a.loc === undefined || b.loc === undefined) {
            return 0;
        }
        let aEndLine = ob1_1.ob1Get1(a.loc.end.line);
        let bStartLine = ob1_1.ob1Get1(b.loc.start.line);
        // Simple cases:
        //  1. `a` and `b` are on the same line
        //  2. `a` and `b` are on their own line without empty lines between them
        if (bStartLine - aEndLine <= 1) {
            return bStartLine - aEndLine;
        }
        // If the are more than one line between `a` and `b`, the comment nodes must
        // be inspected to detect empty lines.
        //
        // In the following example, `getLinesBetween` should return `1`.
        //
        //     a;
        //     /* COMMENT */
        //     b;
        const aTrailingComments = this.getComments('trailingComments', a, true);
        const bLeadingComments = this.getComments('leadingComments', b, true);
        // Comments must be deduplicated because they are shared between nodes.
        // Walk them in order to calculate the nodes' boundaries.
        if (aTrailingComments !== undefined || bLeadingComments !== undefined) {
            const seenComments = new Set();
            // Expand `a` boundaries
            if (aTrailingComments !== undefined) {
                for (const comment of aTrailingComments) {
                    seenComments.add(comment);
                    if (comment.loc !== undefined) {
                        aEndLine = Math.max(aEndLine, ob1_1.ob1Get1(comment.loc.end.line));
                    }
                }
            }
            // Expand `b` boundaries
            if (bLeadingComments !== undefined) {
                for (const comment of bLeadingComments) {
                    if (seenComments.has(comment)) {
                        continue;
                    }
                    if (comment.loc !== undefined) {
                        bStartLine = Math.min(bStartLine, ob1_1.ob1Get1(comment.loc.start.line));
                    }
                }
            }
        }
        return bStartLine - aEndLine;
    }
}
exports.default = Builder;
