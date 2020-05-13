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
const RESTRICTED_GLOBALS = ['event', 'error'];
exports.default = {
    name: 'restrictedGlobal',
    enter(path) {
        const { node, scope } = path;
        if ((node.type === 'ReferenceIdentifier' ||
            node.type === 'JSXReferenceIdentifier') &&
            !js_ast_utils_1.isInTypeAnnotation(path)) {
            const { name } = node;
            const binding = scope.getBinding(name);
            const isDefined = binding !== undefined;
            const isAGlobal = scope.getRootScope().isGlobal(name);
            if (!isDefined && isAGlobal && RESTRICTED_GLOBALS.includes(name)) {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.RESTRICTED_GLOBALS(name));
            }
        }
        return node;
    },
};
