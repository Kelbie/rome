"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class CommentsConsumer {
    constructor(seedComments = []) {
        this.idToComment = new Map();
        this.counter = seedComments.length;
        this.setComments(seedComments);
    }
    setComments(comments) {
        this.idToComment.clear();
        for (const comment of comments) {
            this.idToComment.set(comment.id, comment);
        }
    }
    getCommentsFromIds(ids) {
        if (ids === undefined) {
            return [];
        }
        const comments = [];
        for (const id of ids) {
            const comment = this.getCommentFromId(id);
            if (comment !== undefined) {
                comments.push(comment);
            }
        }
        return comments;
    }
    getIdsFromComments(comments) {
        return comments.map((comment) => comment.id);
    }
    getAllComments() {
        return Array.from(this.idToComment.values());
    }
    getCommentFromId(id) {
        return this.idToComment.get(id);
    }
    assertGetCommentFromId(id) {
        const comment = this.getCommentFromId(id);
        if (comment === undefined) {
            throw new Error(`No comment found for id ${id}`);
        }
        return comment;
    }
    getNextId() {
        return String(this.counter++);
    }
    updateComment(comment) {
        this.idToComment.set(comment.id, comment);
    }
    removeComment(id) {
        this.idToComment.delete(id);
    }
    addComment(withoutId) {
        const withId = {
            ...withoutId,
            id: this.getNextId(),
        };
        this.idToComment.set(withId.id, withId);
        return withId;
    }
}
exports.default = CommentsConsumer;
