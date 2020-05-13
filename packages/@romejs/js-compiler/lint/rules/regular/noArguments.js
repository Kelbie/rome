"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noArguments',
    enter(path) {
        const { node, scope } = path;
        if (node.type === 'ReferenceIdentifier' && node.name === 'arguments') {
            const args = scope.getBinding('arguments');
            if (args && args.kind === 'arguments') {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_ARGUMENTS);
            }
        }
        return node;
    },
};
