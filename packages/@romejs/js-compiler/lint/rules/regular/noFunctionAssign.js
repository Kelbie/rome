"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const bindings_1 = require("@romejs/js-compiler/scope/bindings");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noFunctionAssign',
    enter(path) {
        const { node, scope } = path;
        if (node.type === 'AssignmentIdentifier' &&
            scope.getBinding(node.name) instanceof bindings_1.FunctionBinding) {
            path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_FUNCTION_ASSIGN);
        }
        return node;
    },
};
