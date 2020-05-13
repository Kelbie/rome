"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const _utils_1 = require("../_utils");
const js_compiler_1 = require("@romejs/js-compiler");
exports.default = {
    name: 'esToCJSTransform',
    enter(path) {
        const { node } = path;
        if (!js_ast_1.program.is(node)) {
            return node;
        }
        const options = _utils_1.getOptions(path.context);
        const topBody = [];
        const bottomBody = [];
        for (const bodyNode of node.body) {
            if (bodyNode.type === 'ImportDeclaration') {
                if (bodyNode.importKind === 'type') {
                    continue;
                }
                const moduleId = _utils_1.getModuleId(bodyNode.source.value, options);
                if (moduleId === undefined) {
                    continue;
                }
                const source = js_ast_1.stringLiteral.create({
                    value: moduleId,
                });
                const specifiers = js_ast_utils_1.getImportSpecifiers(bodyNode);
                if (specifiers.length === 0) {
                    topBody.push(js_ast_utils_1.template.statement `Rome.requireNamespace(${source});`);
                }
                else {
                    for (const specifier of specifiers) {
                        if (specifier.local.importKind === 'type') {
                            continue;
                        }
                        if (specifier.type === 'ImportSpecifier') {
                            topBody.push(js_ast_utils_1.template.statement `const ${specifier.local.name} = Rome.requireNamespace(${source}).${specifier.imported};`);
                        }
                        else if (specifier.type === 'ImportNamespaceSpecifier') {
                            topBody.push(js_ast_utils_1.template.statement `const ${specifier.local.name} = Rome.requireNamespace(${source});`);
                        }
                        else if (specifier.type === 'ImportDefaultSpecifier') {
                            topBody.push(js_ast_utils_1.template.statement `const ${specifier.local.name} = Rome.requireDefault(${source});`);
                        }
                    }
                }
                continue;
            }
            if (bodyNode.type === 'ExportAllDeclaration') {
                // TODO
                continue;
            }
            if (bodyNode.type === 'ExportExternalDeclaration') {
                if (bodyNode.exportKind === 'type') {
                    continue;
                }
                const { source } = bodyNode;
                // TODO defaultSpecifier and namespaceSpecifier
                for (const specifier of bodyNode.namedSpecifiers) {
                    topBody.push(js_ast_utils_1.template.statement `Object.defineProperty(exports, ${js_ast_1.stringLiteral.create({
                        value: specifier.exported.name,
                    })}, {
                get: function() {
                  return Rome.requireNamespace(${source}).${specifier.local};
                },
              })`);
                }
            }
            if (bodyNode.type === 'ExportLocalDeclaration') {
                if (bodyNode.exportKind === 'type') {
                    continue;
                }
                const { declaration, specifiers } = bodyNode;
                if (declaration !== undefined) {
                    // Hoist function declarations
                    if (declaration.type === 'FunctionDeclaration') {
                        topBody.push(js_ast_utils_1.template.statement `exports.${declaration.id} = ${declaration.id}`);
                        bottomBody.push(declaration);
                        continue;
                    }
                    // Handle type declarations (these have no runtime ordering implications)
                    if (declaration.type === 'TSModuleDeclaration' ||
                        declaration.type === 'TSEnumDeclaration' ||
                        declaration.type === 'FlowInterfaceDeclaration' ||
                        declaration.type === 'TypeAliasTypeAnnotation' ||
                        declaration.type === 'TSInterfaceDeclaration' ||
                        declaration.type === 'TSDeclareFunction' ||
                        declaration.type === 'FlowOpaqueType') {
                        bottomBody.push(declaration);
                        continue;
                    }
                    // Handle variables and classes
                    if (declaration.type === 'VariableDeclarationStatement' ||
                        declaration.type === 'ClassDeclaration') {
                        bottomBody.push(declaration);
                        for (const id of js_ast_utils_1.getBindingIdentifiers(declaration)) {
                            topBody.push(js_ast_utils_1.template.statement `exports.${id} = undefined;`);
                            bottomBody.push(js_ast_utils_1.template.statement `exports.${id} = ${id};`);
                        }
                    }
                }
                if (specifiers !== undefined) {
                    for (const specifier of specifiers) {
                        const binding = path.scope.getBinding(specifier.local.name);
                        if (binding instanceof js_compiler_1.FunctionBinding) {
                            topBody.push(js_ast_utils_1.template.statement `exports.${specifier.exported} = ${specifier.local};`);
                        }
                        else {
                            topBody.push(js_ast_utils_1.template.statement `exports.${specifier.exported} = undefined;`);
                            bottomBody.push(js_ast_utils_1.template.statement `exports.${specifier.exported} = ${specifier.local};`);
                        }
                    }
                }
                continue;
            }
            if (bodyNode.type === 'ExportDefaultDeclaration') {
                const { declaration } = bodyNode;
                // Hoist function declarations
                if (declaration.type === 'FunctionDeclaration') {
                    // If it has an id then there's no way that anything in the program can refer to it, so inline it as a function expression
                    if (declaration.id === undefined) {
                        const expr = {
                            ...declaration,
                            type: 'FunctionExpression',
                        };
                        topBody.push(js_ast_utils_1.template.statement `exports.default = ${expr};`);
                    }
                    else {
                        topBody.push(declaration);
                        topBody.push(js_ast_utils_1.template.statement `exports.default = ${declaration.id};`);
                    }
                    continue;
                }
                // Handle classes
                if (declaration.type === 'ClassDeclaration') {
                    // Technically we could hoist these if they have no super class, but we don't as it's not spec compliant
                    topBody.push(js_ast_utils_1.template.statement `exports.default = undefined;`);
                    if (declaration.id === undefined) {
                        const expr = {
                            ...declaration,
                            type: 'ClassExpression',
                        };
                        bottomBody.push(js_ast_utils_1.template.statement `exports.default = ${expr};`);
                    }
                    else {
                        bottomBody.push(declaration);
                        bottomBody.push(js_ast_utils_1.template.statement `exports.default = ${declaration.id};`);
                    }
                    continue;
                }
                // Handle type declarations (these have no runtime ordering implications)
                if (declaration.type === 'FlowDeclareOpaqueType' ||
                    declaration.type === 'TSInterfaceDeclaration' ||
                    declaration.type === 'TSDeclareFunction') {
                    // Maybe we should keep them? Not sure what they would desugar to
                    continue;
                }
                // Otherwise it's an expression
                bottomBody.push(js_ast_utils_1.template.statement `exports.default = ${declaration};`);
                // There are cases where we could omit this declaration at all if we the file has no imports, some other conditions etc
                topBody.push(js_ast_utils_1.template.statement `exports.default = undefined;`);
                continue;
            }
            bottomBody.push(bodyNode);
        }
        return {
            ...node,
            body: [...topBody, ...bottomBody],
        };
    },
};
