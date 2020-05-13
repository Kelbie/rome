"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'getterReturn',
    enter(path) {
        const { node } = path;
        if ((node.type === 'ClassMethod' || node.type === 'ObjectMethod') &&
            node.kind === 'get') {
            for (const record of js_ast_utils_1.getCompletionRecords(node.body)) {
                if (record.type === 'INVALID') {
                    path.context.addNodeDiagnostic(record.node, diagnostics_1.descriptions.LINT.GETTER_RETURN(record.description));
                }
            }
        }
        return node;
    },
};
