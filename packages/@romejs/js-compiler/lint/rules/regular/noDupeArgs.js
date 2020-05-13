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
    name: 'noDupeArgs',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'FunctionHead') {
            const uniqueIdentifiers = new Set();
            for (const param of node.params) {
                for (const { name } of js_ast_utils_1.getBindingIdentifiers(param)) {
                    if (uniqueIdentifiers.has(name)) {
                        context.addNodeDiagnostic(param, diagnostics_1.descriptions.LINT.NO_DUPE_ARGS(name));
                    }
                    uniqueIdentifiers.add(name);
                }
            }
        }
        return node;
    },
};
