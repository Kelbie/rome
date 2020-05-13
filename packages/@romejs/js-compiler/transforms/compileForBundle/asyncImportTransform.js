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
    name: 'asyncImport',
    enter(path) {
        const { node } = path;
        if (node.type === 'CallExpression' && node.callee.type === 'ImportCall') {
            return {
                ...node,
                callee: js_ast_1.referenceIdentifier.create({
                    name: 'require',
                }),
            };
        }
        return node;
    },
};
