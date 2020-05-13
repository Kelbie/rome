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
    name: 'noCatchAssign',
    enter(path) {
        const { node, context, scope } = path;
        if (node.type === 'AssignmentIdentifier') {
            const binding = scope.getBinding(node.name);
            if (binding !== undefined && binding.kind === 'catch') {
                context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_CATCH_ASSIGN);
            }
        }
        return node;
    },
};
