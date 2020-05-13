"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function isAssignment(path) {
    switch (path.parentPath.node.type) {
        case 'AssignmentExpression':
        case 'AssignmentArrayPattern':
        case 'AssignmentObjectPatternProperty':
        case 'UpdateExpression':
        case 'AssignmentObjectPattern':
        case 'ForInStatement':
            return true;
        default:
            return false;
    }
}
exports.default = {
    name: 'noImportAssign',
    enter(path) {
        const { node, scope } = path;
        if ((node.type === 'AssignmentIdentifier' && isAssignment(path)) ||
            (node.type === 'ReferenceIdentifier' &&
                path.parentPath.node.type === 'UpdateExpression')) {
            const binding = scope.getBinding(node.name);
            if (binding !== undefined && binding.kind === 'import') {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_IMPORT_ASSIGN(node.name));
            }
        }
        return node;
    },
};
