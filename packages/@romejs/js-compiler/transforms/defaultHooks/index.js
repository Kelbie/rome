"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_1 = require("@romejs/js-ast");
exports.bindingInjector = js_compiler_1.createHook({
    name: 'bindingInjectorHook',
    initialState: {
        bindings: [],
    },
    call(path, state, opts = {}) {
        const name = opts.name === undefined ? path.scope.generateUid() : opts.name;
        const ref = js_ast_1.referenceIdentifier.quick(name);
        // lol
        const ass = js_ast_1.assignmentIdentifier.quick(name);
        return {
            value: [ref, ass],
            state: {
                bindings: [...state.bindings, [name, opts.init]],
            },
        };
    },
    exit(path, state) {
        const { node } = path;
        if (node.type !== 'BlockStatement' && node.type !== 'Program') {
            throw new Error('Never should have been used as a provider');
        }
        const { bindings } = state;
        if (bindings.length === 0) {
            return node;
        }
        return {
            ...node,
            body: [
                js_ast_1.variableDeclarationStatement.quick(js_ast_1.variableDeclaration.create({
                    kind: 'var',
                    declarations: bindings.map(([name, init]) => {
                        return js_ast_1.variableDeclarator.create({
                            id: js_ast_1.bindingIdentifier.quick(name),
                            init,
                        });
                    }),
                })),
                ...node.body,
            ],
        };
    },
});
exports.variableInjectorVisitor = {
    name: 'variableInjector',
    enter(path) {
        const { node } = path;
        if (node.type === 'BlockStatement' || node.type === 'Program') {
            path.provideHook(exports.bindingInjector);
        }
        return node;
    },
};
exports.commentInjector = js_compiler_1.createHook({
    name: 'commentInjectorHook',
    initialState: {
        comments: [],
    },
    call(path, state, comment) {
        let commentWithId;
        let comments = state.comments;
        const { id } = comment;
        if (id === undefined) {
            commentWithId = path.context.comments.addComment(comment);
        }
        else {
            // This comment already has an id so update it
            commentWithId = {
                ...comment,
                id,
            };
            path.context.comments.updateComment(commentWithId);
            // Remove from existing comments
            comments = comments.filter((comment) => comment.id !== id);
        }
        return {
            value: commentWithId.id,
            state: {
                comments: [...comments, commentWithId],
            },
        };
    },
    exit(path, state) {
        const { node } = path;
        if (node.type !== 'Program') {
            throw new Error('Never should have been used as a provider');
        }
        return {
            ...node,
            comments: [...node.comments, ...state.comments],
        };
    },
});
exports.commentInjectorVisitor = {
    name: 'commentInjector',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'CommentBlock' || node.type === 'CommentLine') {
            context.comments.updateComment(node);
        }
        if (node.type === 'Program') {
            context.comments.setComments(node.comments);
            return path.provideHook(exports.commentInjector);
        }
        return node;
    },
};
