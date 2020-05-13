"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const js_compiler_1 = require("@romejs/js-compiler");
exports.default = {
    name: 'noDebugger',
    enter(path) {
        const { node } = path;
        if (node.type === 'DebuggerStatement') {
            return path.context.addFixableDiagnostic({
                old: node,
                fixed: js_compiler_1.REDUCE_REMOVE,
            }, diagnostics_1.descriptions.LINT.NO_DEBUGGER);
        }
        return node;
    },
};
