"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const index_1 = require("../../defaultHooks/index");
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'callSpread',
    enter(path) {
        const { node } = path;
        if (node.type === 'CallExpression') {
            let func = node.callee;
            // Impossible to transform a bare super call
            if (func.type === 'Super') {
                return node;
            }
            let hasSpread = false;
            for (const arg of node.arguments) {
                if (arg.type === 'SpreadElement') {
                    hasSpread = true;
                    break;
                }
            }
            if (hasSpread) {
                let prepend;
                let object;
                if (func.type === 'MemberExpression') {
                    const injection = path.callHook(index_1.bindingInjector, {});
                    object = injection[0];
                    prepend = js_ast_1.assignmentExpression.create({
                        operator: '=',
                        left: injection[1],
                        right: func.object,
                    });
                    func = js_ast_1.memberExpression.create({
                        object,
                        property: func.property,
                    });
                }
                else {
                    object = js_ast_1.nullLiteral.create({});
                }
                let call = {
                    type: 'CallExpression',
                    loc: node.loc,
                    callee: js_ast_utils_1.template.expression `${func}.apply`,
                    arguments: [
                        object,
                        js_ast_1.arrayExpression.create({ elements: node.arguments }),
                    ],
                };
                if (prepend === undefined) {
                    return call;
                }
                else {
                    return js_ast_1.sequenceExpression.create({
                        expressions: [prepend, call],
                    });
                }
            }
        }
        return node;
    },
};
