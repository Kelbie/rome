"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    name: 'nullishCoalescing',
    enter(path) {
        const { node } = path;
        if (node.type === 'LogicalExpression' && node.operator === '??') {
            // TODO assign `node.left` to a variable and use it as a reference
            return js_ast_utils_1.template.expression `${node.left} == null ? ${node.right} : ${node.left}`;
        }
        return node;
    },
};
