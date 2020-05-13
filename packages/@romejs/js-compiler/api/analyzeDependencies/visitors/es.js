"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const records_1 = require("../records");
const utils_1 = require("../utils");
exports.default = {
    name: 'analyzeDependenciesES',
    enter(path) {
        const { node, scope, context } = path;
        // import('./bar');
        if (node.type === 'ImportCall' && node.argument.type === 'StringLiteral') {
            context.record(new records_1.ImportRecord({
                type: 'es',
                async: true,
                kind: 'value',
                names: [],
                loc: node.argument.loc,
                source: node.argument.value,
                optional: utils_1.isOptional(path),
                all: true,
            }));
        }
        // Local bindings exports:
        // export const foo
        // export function foo() {}
        // export {};
        if (node.type === 'ExportLocalDeclaration') {
            const valueType = utils_1.getAnalyzeExportValueType(scope, node.declaration);
            for (const id of js_ast_utils_1.getBindingIdentifiers(node)) {
                const kind = utils_1.maybeTypeBinding(utils_1.getExportKind(node.exportKind), scope, id);
                context.record(new records_1.ExportRecord({
                    type: 'local',
                    valueType,
                    kind,
                    loc: utils_1.getDeclarationLoc(scope, id),
                    name: id.name,
                }));
            }
            const { specifiers } = node;
            if (specifiers !== undefined) {
                for (const specifier of specifiers) {
                    const kind = utils_1.maybeTypeBinding(utils_1.getExportKind(specifier.exportKind || node.exportKind), scope, specifier.local);
                    context.record(new records_1.ExportRecord({
                        type: 'local',
                        loc: utils_1.getDeclarationLoc(scope, specifier.local),
                        valueType: utils_1.getAnalyzeExportValueType(scope, specifier.local),
                        kind,
                        name: specifier.exported.name,
                    }));
                }
            }
        }
        // export default
        if (node.type === 'ExportDefaultDeclaration') {
            context.record(new records_1.ExportRecord({
                type: 'local',
                loc: utils_1.getDeclarationLoc(scope, node.declaration),
                valueType: utils_1.getAnalyzeExportValueType(scope, node.declaration),
                kind: 'value',
                name: 'default',
            }));
        }
        // External binding exports:
        // export {} from '';
        if (node.type === 'ExportExternalDeclaration') {
            const { source } = node;
            const specifiersKinds = [];
            const exportedNames = [];
            const { namedSpecifiers, defaultSpecifier, namespaceSpecifier } = node;
            if (defaultSpecifier !== undefined) {
                context.record(new records_1.ExportRecord({
                    type: 'external',
                    kind: 'value',
                    loc: defaultSpecifier.loc,
                    imported: 'default',
                    exported: defaultSpecifier.exported.name,
                    source: source.value,
                }));
            }
            if (namespaceSpecifier !== undefined) {
                context.record(new records_1.ExportRecord({
                    type: 'externalNamespace',
                    kind: 'value',
                    loc: namespaceSpecifier.loc,
                    exported: namespaceSpecifier.exported.name,
                    source: source.value,
                }));
            }
            for (const specifier of namedSpecifiers) {
                const kind = utils_1.getImportKind(specifier.exportKind || node.exportKind);
                specifiersKinds.push(kind);
                exportedNames.push({
                    name: specifier.local.name,
                    kind,
                    loc: specifier.loc,
                });
                context.record(new records_1.ExportRecord({
                    type: 'external',
                    kind,
                    loc: specifier.loc,
                    imported: specifier.local.name,
                    exported: specifier.exported.name,
                    source: source.value,
                }));
            }
            context.record(new records_1.ImportRecord({
                type: 'es',
                async: false,
                kind: utils_1.getKindWithSpecifiers(node.exportKind, specifiersKinds),
                names: exportedNames,
                loc: source.loc,
                source: source.value,
                optional: utils_1.isOptional(path),
                all: false,
            }));
        }
        // TS: import A = require('B');
        if (node.type === 'TSImportEqualsDeclaration' &&
            node.moduleReference.type === 'TSExternalModuleReference') {
            context.record(new records_1.ImportRecord({
                type: 'cjs',
                kind: 'value',
                optional: utils_1.isOptional(path),
                loc: node.loc,
                source: node.moduleReference.expression.value,
                names: [],
                all: true,
                async: false,
            }));
        }
        // export * from '';
        if (node.type === 'ExportAllDeclaration') {
            context.record(new records_1.ImportRecord({
                type: 'es',
                async: false,
                kind: utils_1.getExportKind(node.exportKind),
                optional: utils_1.isOptional(path),
                loc: node.source.loc,
                names: [],
                source: node.source.value,
                all: true,
            }));
            context.record(new records_1.ExportRecord({
                type: 'externalAll',
                loc: node.loc,
                kind: utils_1.getExportKind(node.exportKind),
                source: node.source.value,
            }));
        }
        if (node.type === 'ExportAllDeclaration' ||
            node.type === 'ExportDefaultDeclaration' ||
            node.type === 'ExportLocalDeclaration') {
            context.record(new records_1.ESExportRecord(utils_1.getExportKind(node.exportKind), node));
        }
        // import {} from '';
        // import * as foo from '';
        if (node.type === 'ImportDeclaration') {
            let hasNamespaceSpecifier = false;
            const specifierKinds = [];
            const names = [];
            for (const specifier of js_ast_utils_1.getImportSpecifiers(node)) {
                if (specifier.type === 'ImportNamespaceSpecifier') {
                    hasNamespaceSpecifier = true;
                    break;
                }
                const kind = utils_1.getImportKind(specifier.local.importKind || node.importKind);
                specifierKinds.push(kind);
                if (specifier.type === 'ImportDefaultSpecifier') {
                    names.push({
                        kind,
                        loc: specifier.loc,
                        name: 'default',
                    });
                }
                if (specifier.type === 'ImportSpecifier') {
                    names.push({
                        kind,
                        loc: specifier.loc,
                        name: specifier.imported.name,
                    });
                }
            }
            context.record(new records_1.ImportRecord({
                type: 'es',
                async: false,
                kind: utils_1.getKindWithSpecifiers(node.importKind, specifierKinds),
                loc: node.source.loc,
                optional: utils_1.isOptional(path),
                source: node.source.value,
                all: hasNamespaceSpecifier,
                names,
            }));
        }
        // Detect top level await
        if (node.type === 'AwaitExpression' &&
            path.findAncestry((path) => js_ast_utils_1.isFunctionNode(path.node)) === undefined) {
            const { loc } = node;
            if (loc === undefined) {
                throw new Error('loc is undefined on AwaitExpression we want to mark');
            }
            context.record(new records_1.TopLevelAwaitRecord(loc));
        }
        if (node.type === 'ReferenceIdentifier') {
            const binding = path.scope.getBinding(node.name);
            // Mark references to imports outside of functions
            if (binding !== undefined && binding instanceof js_compiler_1.ImportBinding) {
                const { meta } = binding;
                // We can skip this if it's referencing a namespace
                if (meta.type !== 'name') {
                    return node;
                }
                // These are nodes that will defer the execution of code outside the init path
                // (They could still be triggered with an actual function call but this is just for some basic analysis)
                const deferredExecution = path.findAncestry((path) => js_ast_utils_1.isFunctionNode(path.node) || path.node.type === 'ClassProperty');
                const isTop = deferredExecution === undefined;
                let kind = utils_1.getImportKind(meta.kind);
                if (js_ast_utils_1.isInTypeAnnotation(path)) {
                    kind = 'type';
                }
                context.record(new records_1.ImportUsageRecord(isTop, {
                    kind,
                    loc: node.loc,
                    local: node.name,
                    imported: meta.imported,
                    source: meta.source,
                }));
            }
        }
        return node;
    },
};
