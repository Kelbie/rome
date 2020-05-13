"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const string_utils_1 = require("@romejs/string-utils");
function compareImportSpecifiers(a, b) {
    const order = string_utils_1.naturalCompare(a.local.name.name, b.local.name.name, false);
    if (order === 0) {
        return string_utils_1.naturalCompare(a.imported.name, b.imported.name, false);
    }
    else {
        return order;
    }
}
function compareExportSpecifiers(a, b) {
    const order = string_utils_1.naturalCompare(a.local.name, b.local.name, false);
    if (order === 0) {
        return string_utils_1.naturalCompare(a.exported.name, b.exported.name, false);
    }
    else {
        return order;
    }
}
function shouldReorder(a, b) {
    for (let i = 0; i < a.length && i < b.length; i++) {
        if (a[i] !== b[i]) {
            return true;
        }
    }
    return false;
}
exports.default = {
    name: 'sortImportExportSpecifiers',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'ImportDeclaration') {
            if (node.namedSpecifiers.length > 1) {
                const specifiers = node.namedSpecifiers;
                const sortedSpecifiers = specifiers.slice().sort(compareImportSpecifiers);
                if (shouldReorder(specifiers, sortedSpecifiers)) {
                    return context.addFixableDiagnostic({
                        old: node,
                        fixed: { ...node, namedSpecifiers: sortedSpecifiers },
                    }, diagnostics_1.descriptions.LINT.SORT_IMPORT_SPECIFIERS);
                }
            }
        }
        else if (node.type === 'ExportExternalDeclaration') {
            if (node.namedSpecifiers.length > 1) {
                const specifiers = node.namedSpecifiers;
                const sortedSpecifiers = specifiers.slice().sort(compareExportSpecifiers);
                if (shouldReorder(specifiers, sortedSpecifiers)) {
                    return context.addFixableDiagnostic({
                        old: node,
                        fixed: { ...node, namedSpecifiers: sortedSpecifiers },
                    }, diagnostics_1.descriptions.LINT.SORT_EXPORT_SPECIFIERS);
                }
            }
        }
        else if (node.type === 'ExportLocalDeclaration') {
            if (node.specifiers !== undefined && node.specifiers.length > 1) {
                const specifiers = node.specifiers;
                const sortedSpecifiers = specifiers.slice().sort(compareExportSpecifiers);
                if (shouldReorder(specifiers, sortedSpecifiers)) {
                    return context.addFixableDiagnostic({
                        old: node,
                        fixed: { ...node, specifiers: sortedSpecifiers },
                    }, diagnostics_1.descriptions.LINT.SORT_EXPORT_SPECIFIERS);
                }
            }
        }
        return node;
    },
};
