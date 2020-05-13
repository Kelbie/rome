"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noEmptyCharacterClass',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'RegExpCharSet' && node.body.length === 0 && !node.invert) {
            context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_EMPTY_CHAR_SET);
            return js_compiler_1.REDUCE_REMOVE;
        }
        return node;
    },
};
