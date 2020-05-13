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
exports.default = {
    name: 'sparseArray',
    enter(path) {
        const { node, parent } = path;
        if (node.type === 'ArrayHole' && parent.type === 'ArrayExpression') {
            return path.context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.referenceIdentifier.create({ name: 'undefined' }),
            }, diagnostics_1.descriptions.LINT.SPARSE_ARRAY);
        }
        return node;
    },
};
