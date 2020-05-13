"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'templateLiterals',
    enter(path) {
        const { node, parent } = path;
        if (node.type === 'TaggedTemplateExpression') {
            // TODO
        }
        if (node.type === 'TemplateLiteral' &&
            parent.type !== 'TaggedTemplateExpression') {
            const nodes = [];
            const { expressions, quasis } = node;
            let index = 0;
            for (const elem of quasis) {
                if (elem.cooked) {
                    nodes.push(js_ast_1.stringLiteral.create({
                        value: elem.cooked,
                    }));
                }
                if (index < expressions.length) {
                    const expr = expressions[index++];
                    if (expr.type !== 'StringLiteral' || expr.value !== '') {
                        nodes.push(expr);
                    }
                }
            }
            if (nodes.length === 1) {
                return nodes[0];
            }
            // Since `+` is left-to-right associative, nsure the first node is a string if first/second isn't
            if (nodes[0].type !== 'StringLiteral' && nodes[1].type !== 'StringLiteral') {
                nodes.unshift(js_ast_1.stringLiteral.quick(''));
            }
            // Build the final expression
            let root = nodes[0];
            for (let i = 1; i < nodes.length; i++) {
                root = js_ast_1.binaryExpression.create({
                    operator: '+',
                    left: root,
                    right: nodes[i],
                });
            }
            return root;
        }
        return node;
    },
};
