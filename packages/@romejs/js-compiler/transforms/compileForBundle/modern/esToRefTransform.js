"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const _utils_1 = require("../_utils");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'esToRefTransform',
    enter(path) {
        const { node, scope, context } = path;
        const opts = _utils_1.getOptions(context);
        if (js_ast_1.program.is(node)) {
            const mappings = new Map();
            // make all variables private
            for (const [name] of path.scope.bindings) {
                mappings.set(name, _utils_1.getPrivateName(name, opts.moduleId));
            }
            // map exports and imports and correctly
            for (const child of node.body) {
                if (child.type === 'ImportDeclaration' &&
                    child.importKind !== 'type' &&
                    child.importKind !== 'typeof') {
                    const moduleId = _utils_1.getModuleId(child.source.value, opts);
                    if (moduleId === undefined) {
                        continue;
                    }
                    for (const specifier of js_ast_utils_1.getImportSpecifiers(child)) {
                        if (specifier.type === 'ImportSpecifier') {
                            mappings.set(specifier.local.name.name, _utils_1.getPrefixedName(specifier.imported.name, moduleId, opts));
                        }
                        else if (specifier.type === 'ImportNamespaceSpecifier') {
                            mappings.set(specifier.local.name.name, _utils_1.getPrefixedNamespace(moduleId));
                        }
                        else if (specifier.type === 'ImportDefaultSpecifier') {
                            mappings.set(specifier.local.name.name, _utils_1.getPrefixedName('default', moduleId, opts));
                        }
                        else {
                            throw new Error('unexpected');
                        }
                    }
                }
                if (child.type === 'ExportLocalDeclaration') {
                    // export const foo = '';
                    // export function foo() {}
                    for (const { name } of js_ast_utils_1.getBindingIdentifiers(child)) {
                        mappings.set(name, _utils_1.getPrefixedName(name, opts.moduleId, opts));
                    }
                    // export {foo};
                    if (child.specifiers !== undefined) {
                        for (const specifier of child.specifiers) {
                            const local = specifier.local.name;
                            if (scope.getBindingAssert(local) instanceof js_compiler_1.ImportBinding) {
                                continue;
                            }
                            mappings.set(local, _utils_1.getPrefixedName(specifier.exported.name, opts.moduleId, opts));
                        }
                    }
                }
                if (child.type === 'ExportDefaultDeclaration') {
                    const { declaration: decl } = child;
                    if ((decl.type === 'FunctionDeclaration' ||
                        decl.type === 'ClassDeclaration') &&
                        decl.id !== undefined) {
                        mappings.set(decl.id.name, _utils_1.getPrefixedName('default', opts.moduleId, opts));
                    }
                }
            }
            const newProgram = js_ast_1.program.assert(js_ast_utils_1.renameBindings(path, mappings));
            // Get new scope with updated bindings. TODO Maybe `renameBindings` should return the path?
            const newScope = scope.getRootScope().evaluate(newProgram, undefined, true);
            if (opts.moduleAll === true) {
                // Get all the export names
                const exportNames = new Map();
                for (const child of newProgram.body) {
                    if (child.type === 'ExportDefaultDeclaration') {
                        exportNames.set('default', _utils_1.getPrefixedName('default', opts.moduleId, opts));
                    }
                    if (child.type === 'ExportExternalDeclaration') {
                        // TODO defaultSpecifier and namespaceSpecifier
                        const { source } = child;
                        for (const specifier of child.namedSpecifiers) {
                            // If this is an external export then use the correct name
                            const moduleId = _utils_1.getModuleId(source.value, opts);
                            if (moduleId === undefined) {
                                continue;
                            }
                            const local = _utils_1.getPrefixedName(specifier.local.name, moduleId, opts);
                            exportNames.set(specifier.exported.name, local);
                        }
                    }
                    if (child.type === 'ExportLocalDeclaration') {
                        if (child.declaration !== undefined) {
                            throw new Error('No export declarations should be here as they have been removed by renameBindings');
                        }
                        const { specifiers } = child;
                        if (specifiers !== undefined) {
                            for (const specifier of specifiers) {
                                // The local binding has already been rewritten by renameBindings if it existed
                                exportNames.set(specifier.exported.name, specifier.local.name);
                            }
                        }
                    }
                }
                const exportObjProps = [];
                for (const [exported, local] of exportNames) {
                    const binding = newScope.getBinding(local);
                    if (binding !== undefined) {
                        if (binding instanceof js_compiler_1.TypeBinding) {
                            continue;
                        }
                        if (binding instanceof js_compiler_1.FunctionBinding) {
                            exportObjProps.push(js_ast_1.objectProperty.create({
                                key: js_ast_1.staticPropertyKey.quick(js_ast_1.identifier.quick(exported)),
                                value: js_ast_1.referenceIdentifier.quick(local),
                            }));
                            continue;
                        }
                    }
                    exportObjProps.push(js_ast_1.objectMethod.create({
                        kind: 'get',
                        key: js_ast_1.staticPropertyKey.quick(js_ast_1.identifier.quick(exported)),
                        head: js_ast_1.functionHead.quick([]),
                        body: js_ast_1.blockStatement.create({
                            body: [
                                js_ast_1.returnStatement.create({
                                    argument: js_ast_1.referenceIdentifier.create({
                                        name: local,
                                    }),
                                }),
                            ],
                        }),
                    }));
                }
                const exportObj = js_ast_1.objectExpression.create({ properties: exportObjProps });
                return {
                    ...newProgram,
                    type: 'Program',
                    body: [
                        js_ast_1.variableDeclarationStatement.quick(js_ast_1.variableDeclaration.create({
                            kind: 'const',
                            declarations: [
                                js_ast_1.variableDeclarator.create({
                                    id: js_ast_1.bindingIdentifier.create({
                                        name: _utils_1.getPrefixedNamespace(opts.moduleId),
                                    }),
                                    init: exportObj,
                                }),
                            ],
                        })),
                        ...newProgram.body,
                    ],
                };
            }
            else {
                return newProgram;
            }
        }
        if (node.type === 'ImportDeclaration') {
            // should have already been handled with the Program branch
            return js_compiler_1.REDUCE_REMOVE;
        }
        if (node.type === 'ExportDefaultDeclaration') {
            const { declaration } = node;
            if (declaration.type === 'FunctionDeclaration' ||
                declaration.type === 'ClassDeclaration') {
                if (declaration.id === undefined) {
                    return {
                        // give it the correct name
                        ...node,
                        declaration: {
                            ...declaration,
                            id: js_ast_1.bindingIdentifier.create({
                                name: _utils_1.getPrefixedName('default', opts.moduleId, opts),
                            }),
                        },
                    };
                }
                else {
                    // if the export was named then we'll have already given it the correct name
                    return declaration;
                }
            }
            else {
                return js_ast_utils_1.template.statement `const ${_utils_1.getPrefixedName('default', opts.moduleId, opts)} = ${declaration};`;
            }
        }
        if (node.type === 'ExportExternalDeclaration') {
            // Remove external exports with a source as they will be resolved correctly and never point here
            return js_compiler_1.REDUCE_REMOVE;
        }
        if (node.type === 'ExportLocalDeclaration') {
            const { declaration, specifiers } = node;
            if (specifiers === undefined) {
                if (declaration === undefined) {
                    throw new Error("No specifiers or declaration existed, if there's no specifiers then there should be a declaration");
                }
                return declaration;
            }
            else {
                // check if any of the specifiers reference a global or import
                // if so, we need to insert declarations for them
                const nodes = [];
                for (const specifier of specifiers) {
                    if (specifier.type === 'ExportLocalSpecifier') {
                        const binding = path.scope.getBinding(specifier.local.name);
                        // TODO we only really need this declaration for global bindings, `analyze()` could detect the exported import and resolvedImports would just work
                        if (binding === undefined || binding instanceof js_compiler_1.ImportBinding) {
                            nodes.push(js_ast_1.variableDeclaration.create({
                                kind: 'const',
                                declarations: [
                                    js_ast_1.variableDeclarator.create({
                                        id: js_ast_1.bindingIdentifier.create({
                                            name: _utils_1.getPrefixedName(specifier.exported.name, opts.moduleId, opts),
                                        }),
                                        init: js_ast_1.referenceIdentifier.quick(specifier.local.name),
                                    }),
                                ],
                            }));
                        }
                    }
                    else {
                        // TODO ???
                    }
                }
                if (nodes.length === 0) {
                    return js_compiler_1.REDUCE_REMOVE;
                }
                else {
                    return nodes;
                }
            }
        }
        if (node.type === 'ExportAllDeclaration' && opts.moduleAll === true) {
            const moduleId = _utils_1.getModuleId(node.source.value, opts);
            if (moduleId === undefined) {
                return node;
            }
            const theirNamespace = _utils_1.getPrefixedNamespace(moduleId);
            const ourNamespace = _utils_1.getPrefixedNamespace(opts.moduleId);
            return js_ast_utils_1.template.statement `
        Object.keys(${theirNamespace}).forEach(function (key) {
          if (key === 'default') return undefined;
          Object.defineProperty(${ourNamespace}, key, {
            enumerable: true,
            configurable: true,
            get: function get() {
              return ${theirNamespace}[key];
            }
          });
        });
      `;
        }
        if (node.type === 'ExportAllDeclaration' && opts.moduleAll !== true) {
            // We can remove these, this signature has already been flagged by analyze() and we'll automatically forward it
            return js_compiler_1.REDUCE_REMOVE;
        }
        return node;
    },
};
