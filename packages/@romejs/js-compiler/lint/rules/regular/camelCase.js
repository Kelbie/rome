"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_utils_1 = require("@romejs/string-utils");
const diagnostics_1 = require("@romejs/diagnostics");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function normalizeCamelCase(name) {
    if (!js_ast_utils_1.isValidIdentifierName(name)) {
        return undefined;
    }
    if (name === '') {
        return undefined;
    }
    return name;
}
// Allow prefixed underscores
function toVariableCamelCase(name, forceCapitalize) {
    // Allow shouty constants
    if (name.toUpperCase() === name) {
        return normalizeCamelCase(name);
    }
    let prefix = '';
    let suffix = '';
    const prefixDashes = name.match(/^_+/);
    if (prefixDashes != null) {
        prefix = prefixDashes[0];
    }
    const suffixDashes = name.match(/_+$/);
    if (suffixDashes != null) {
        suffix = suffixDashes[0];
    }
    // Remove prefix and suffix
    let slicedName = name.slice(prefix.length);
    if (suffix.length > 0) {
        slicedName = slicedName.slice(0, -suffix.length);
    }
    const camelName = prefix + string_utils_1.toCamelCase(slicedName, forceCapitalize) + suffix;
    return normalizeCamelCase(camelName);
}
exports.toVariableCamelCase = toVariableCamelCase;
exports.default = {
    name: 'camelCase',
    enter(path) {
        const { node, scope, context } = path;
        // Check variables
        if (node === scope.node) {
            const renames = new Map();
            for (const [name, binding] of scope.getOwnBindings()) {
                const camelName = toVariableCamelCase(name);
                if (camelName !== undefined && camelName !== name) {
                    const { suppressed } = context.addNodeDiagnostic(binding.node, diagnostics_1.descriptions.LINT.VARIABLE_CAMEL_CASE(name, camelName), { fixable: true });
                    if (!suppressed) {
                        renames.set(binding, camelName);
                    }
                }
            }
            if (renames.size > 0) {
                return js_ast_utils_1.renameBindings(path, renames);
            }
        }
        // Check regular identifiers, variable identifiers have already been checked above
        if (js_ast_utils_1.isIdentifierish(node) && !js_ast_utils_1.isVariableIdentifier(node)) {
            const { name } = node;
            const camelName = toVariableCamelCase(name);
            if (camelName !== undefined && camelName !== name) {
                return context.addFixableDiagnostic({
                    old: node,
                    suggestions: [
                        {
                            title: 'Convert to camelCase',
                            description: 'This may not be safe. Are you passing this into a third party module?',
                            fixed: { ...node, name: camelName },
                        },
                    ],
                }, diagnostics_1.descriptions.LINT.IDENTIFIER_CAMEL_CASE(name, camelName));
            }
        }
        return node;
    },
};
