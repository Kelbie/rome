"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
function isOptional(path) {
    for (const { node } of path.ancestryPaths) {
        if (node.type === 'TryStatement') {
            return true;
        }
    }
    return false;
}
exports.isOptional = isOptional;
function isTypeKind(kind) {
    return kind === 'type' || kind === 'typeof';
}
exports.isTypeKind = isTypeKind;
function getImportKind(kind) {
    return kind === undefined ? 'value' : kind;
}
exports.getImportKind = getImportKind;
function getExportKind(kind) {
    return kind === undefined ? 'value' : kind;
}
exports.getExportKind = getExportKind;
function maybeTypeBinding(kind, scope, id) {
    const binding = scope.getBinding(id.name);
    if (kind === 'value' && binding instanceof js_compiler_1.TypeBinding) {
        return 'type';
    }
    else {
        return kind;
    }
}
exports.maybeTypeBinding = maybeTypeBinding;
function getKindWithSpecifiers(rawKind, specifierKinds) {
    const kind = getImportKind(rawKind);
    if (isTypeKind(kind) || specifierKinds.length === 0) {
        return kind;
    }
    for (const specifierKind of specifierKinds) {
        if (specifierKind === 'value') {
            return 'value';
        }
    }
    return 'type';
}
exports.getKindWithSpecifiers = getKindWithSpecifiers;
// We use this to have an easy way to identify the actual runtime type of an import
// This is useful as we needs this as Flow allows you to `import type` classes which
// are considered values
function getAnalyzeExportValueType(scope, node) {
    if (node === undefined) {
        return 'other';
    }
    if (node.type === 'Identifier') {
        const binding = scope.getBinding(node.name);
        if (binding instanceof js_compiler_1.FunctionBinding) {
            return 'function';
        }
        if (binding instanceof js_compiler_1.ClassBinding) {
            return 'class';
        }
        if (binding instanceof js_compiler_1.TypeBinding) {
            const { typeKind } = binding;
            switch (typeKind) {
                case 'function':
                case 'class':
                    return typeKind;
            }
        }
    }
    if (node.type === 'FunctionDeclaration') {
        return 'function';
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        return 'class';
    }
    return 'other';
}
exports.getAnalyzeExportValueType = getAnalyzeExportValueType;
// Resolve a export declaration to it's binding node if one exists
function getDeclarationLoc(scope, node) {
    if (node.type === 'ReferenceIdentifier') {
        const binding = scope.getBinding(node.name);
        if (binding !== undefined) {
            return binding.node.loc;
        }
    }
    return node.loc;
}
exports.getDeclarationLoc = getDeclarationLoc;
function arraySame(a, b, callback) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!callback(a[i], b[i])) {
            return false;
        }
    }
    return true;
}
function syntaxSame(a, b) {
    return a === b;
}
function exportsSame(a, b) {
    if (a.type !== b.type) {
        return false;
    }
    if (a.kind !== b.kind) {
        return false;
    }
    switch (a.type) {
        case 'local':
            return b.type === 'local' && a.name === b.name;
        case 'external':
            return (b.type === 'external' &&
                a.imported === b.imported &&
                a.exported === b.exported &&
                a.source === b.source);
        case 'externalAll':
            return b.type === 'externalAll' && a.source === b.source;
        case 'externalNamespace':
            return (b.type === 'externalNamespace' &&
                a.source === b.source &&
                a.exported === b.exported);
    }
}
function dependencyNameSame(a, b) {
    return a.kind === b.kind && a.name === b.name;
}
function dependenciesSame(a, b) {
    return (a.all === b.all &&
        a.async === b.async &&
        a.optional === b.optional &&
        a.source === b.source &&
        a.type === b.type &&
        arraySame(a.names, b.names, dependencyNameSame));
}
// Check if the shape of two analyzeDependencyResults are equal. Ignoring location information
function areAnalyzeDependencyResultsEqual(a, b) {
    if ((a.firstTopAwaitLocation === undefined &&
        b.firstTopAwaitLocation !== undefined) ||
        (b.firstTopAwaitLocation === undefined &&
            a.firstTopAwaitLocation !== undefined)) {
        return false;
    }
    if (a.moduleType !== b.moduleType) {
        return false;
    }
    if (!arraySame(a.syntax, b.syntax, syntaxSame)) {
        return false;
    }
    if (!arraySame(a.exports, b.exports, exportsSame)) {
        return false;
    }
    if (!arraySame(a.dependencies, b.dependencies, dependenciesSame)) {
        return false;
    }
    return true;
}
exports.areAnalyzeDependencyResultsEqual = areAnalyzeDependencyResultsEqual;
