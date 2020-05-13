"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const diagnostics_1 = require("@romejs/diagnostics");
const defaultHooks_1 = require("../../../transforms/defaultHooks");
exports.default = {
    name: 'preferBlockStatements',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'IfStatement') {
            let shouldFix = false;
            let consequent = node.consequent;
            let alternate = node.alternate;
            if (node.consequent.type !== 'BlockStatement') {
                consequent = js_ast_1.blockStatement.quick([node.consequent]);
                shouldFix = true;
            }
            if (node.alternate !== undefined &&
                node.alternate.type !== 'BlockStatement' &&
                node.alternate.type !== 'IfStatement') {
                alternate = js_ast_1.blockStatement.quick([node.alternate]);
                shouldFix = true;
            }
            if (shouldFix) {
                return context.addFixableDiagnostic({
                    old: node,
                    fixed: {
                        ...node,
                        consequent,
                        alternate,
                    },
                }, diagnostics_1.descriptions.LINT.PREFER_BLOCK_STATEMENT);
            }
        }
        else if (node.type === 'ForStatement' ||
            node.type === 'ForInStatement' ||
            node.type === 'ForOfStatement' ||
            node.type === 'DoWhileStatement' ||
            node.type === 'WhileStatement' ||
            node.type === 'WithStatement') {
            if (node.body.type === 'EmptyStatement') {
                const id = path.callHook(defaultHooks_1.commentInjector, {
                    type: 'CommentLine',
                    value: ' empty',
                });
                return context.addFixableDiagnostic({
                    old: node,
                    fixed: {
                        ...node,
                        body: js_ast_1.blockStatement.create({
                            innerComments: [id],
                            body: [],
                        }),
                    },
                }, diagnostics_1.descriptions.LINT.PREFER_BLOCK_STATEMENT);
            }
            if (node.body.type !== 'BlockStatement') {
                return context.addFixableDiagnostic({
                    old: node,
                    fixed: {
                        ...node,
                        body: js_ast_1.blockStatement.quick([node.body]),
                    },
                }, diagnostics_1.descriptions.LINT.PREFER_BLOCK_STATEMENT);
            }
        }
        return node;
    },
};
