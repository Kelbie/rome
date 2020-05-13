"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@romejs/js-compiler/scope/globals");
const diagnostics_1 = require("@romejs/diagnostics");
const restrictedNames = new Set([...globals_1.builtin, ...globals_1.es5, ...globals_1.es2015, ...globals_1.es2017]);
exports.default = {
    name: 'noShadowRestrictedNames',
    enter(path) {
        const { node, context, scope } = path;
        if (scope.node === node) {
            for (const [name, binding] of scope.getOwnBindings()) {
                if (restrictedNames.has(name)) {
                    context.addNodeDiagnostic(binding.node, diagnostics_1.descriptions.LINT.NO_SHADOW_RESTRICTED_NAMES(name));
                }
            }
        }
        return node;
    },
};
