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
    name: 'caseSingleStatement',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'SwitchCase' && node.consequent.length > 1) {
            return context.addFixableDiagnostic({
                old: node,
                fixed: {
                    ...node,
                    consequent: [js_ast_1.blockStatement.quick(node.consequent)],
                },
            }, diagnostics_1.descriptions.LINT.CASE_SINGLE_STATEMENT);
        }
        return node;
    },
};
