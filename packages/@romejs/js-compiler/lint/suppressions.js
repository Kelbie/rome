"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ob1_1 = require("@romejs/ob1");
const suppressions_1 = require("../suppressions");
const index_1 = require("../transforms/defaultHooks/index");
function getStartLine(node) {
    const { loc } = node;
    if (loc === undefined) {
        return undefined;
    }
    else {
        return loc.start.line;
    }
}
function buildSuppressionCommentValue(categories) {
    return `${suppressions_1.SUPPRESSION_START} ${Array.from(categories).join(' ')}`;
}
function addSuppressions(context, ast) {
    if (!context.hasLintDecisions()) {
        return ast;
    }
    const visitedLines = new Set();
    function addComment(path, node, decisions) {
        // Find all suppression decisions
        const suppressionCategories = new Set();
        for (const { category, action } of decisions) {
            if (action === 'suppress') {
                suppressionCategories.add(category);
            }
        }
        if (suppressionCategories.size === 0) {
            return node;
        }
        // Find existing suppression comment
        let updateComment;
        const lastComment = context.comments.getCommentsFromIds(node.leadingComments).pop();
        if (lastComment !== undefined &&
            lastComment.value.includes(suppressions_1.SUPPRESSION_START)) {
            updateComment = lastComment;
        }
        // Insert new comment if there's none to update
        if (updateComment === undefined) {
            const id = path.callHook(index_1.commentInjector, {
                type: 'CommentLine',
                value: ` ${buildSuppressionCommentValue(suppressionCategories)}`,
            });
            return {
                ...node,
                leadingComments: [...(node.leadingComments || []), id],
            };
        }
        // Remove all categories that are already included in the suppression
        for (const category of suppressionCategories) {
            if (updateComment.value.includes(category)) {
                suppressionCategories.delete(category);
            }
        }
        // We may have eliminated them all
        if (suppressionCategories.size > 0) {
            path.callHook(index_1.commentInjector, {
                ...updateComment,
                value: updateComment.value.replace(suppressions_1.SUPPRESSION_START, buildSuppressionCommentValue(suppressionCategories)),
            });
        }
        return node;
    }
    // Find the best node to attach comments to. This is generally the node with the largest range per line.
    return context.reduceRoot(ast, {
        name: 'suppressionVisitor',
        enter(path) {
            const { node } = path;
            // Don't allow attaching suppression comments to a comment or program...
            if (node.type === 'CommentBlock' ||
                node.type === 'CommentLine' ||
                node.type === 'Program') {
                return node;
            }
            const line = getStartLine(node);
            if (line === undefined || visitedLines.has(line)) {
                return node;
            }
            const decisions = context.getLintDecisions(String(ob1_1.ob1Get1(line)));
            if (decisions.length === 0) {
                return node;
            }
            visitedLines.add(line);
            return addComment(path, node, decisions);
        },
    });
}
exports.addSuppressions = addSuppressions;
