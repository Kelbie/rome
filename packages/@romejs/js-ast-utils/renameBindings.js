"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const inheritLoc_1 = require("./inheritLoc");
const js_ast_1 = require("@romejs/js-ast");
const getBindingIdentifiers_1 = require("./getBindingIdentifiers");
const isVariableIdentifier_1 = require("./isVariableIdentifier");
const assertSingleOrMultipleNodes_1 = require("./assertSingleOrMultipleNodes");
// This methods allows either passing in Bindings that could be present within deep scopes,
// or local names for the scope in the passed Path
function renameBindings(path, oldToNewMapping) {
    if (oldToNewMapping.size === 0) {
        return path.node;
    }
    const oldBindingToNewName = new Map();
    // get a list of the current bindings for this scope
    const oldNameToBinding = new Map();
    for (const [oldName, newName] of oldToNewMapping) {
        if (typeof oldName === 'string') {
            const binding = path.scope.getBinding(oldName);
            oldNameToBinding.set(oldName, binding);
        }
        else {
            oldBindingToNewName.set(oldName, newName);
        }
    }
    // discover nodes to replace first without manipulating the AST as that will change the scope and binding objects
    const replaceNodesWithName = new Map();
    path.traverse('renameBindingsCollector', (path) => {
        const { node, scope } = path;
        if (!isVariableIdentifier_1.default(node)) {
            return;
        }
        const binding = scope.getBinding(node.name);
        // oldName -> newName
        if (oldToNewMapping.has(node.name) &&
            binding === oldNameToBinding.get(node.name)) {
            const newName = oldToNewMapping.get(node.name);
            if (newName === undefined) {
                throw new Error('Should exist');
            }
            replaceNodesWithName.set(node, newName);
        }
        // Binding -> newName
        if (binding !== undefined && oldBindingToNewName.has(binding)) {
            const newName = oldBindingToNewName.get(binding);
            if (newName === undefined) {
                throw new Error('Should exist');
            }
            replaceNodesWithName.set(node, newName);
        }
    });
    if (replaceNodesWithName.size === 0) {
        return path.node;
    }
    //
    const replaced = new Set();
    // replace the nodes
    const renamedNode = path.reduce({
        name: 'renameBindings',
        enter(path) {
            const { node } = path;
            // Retain the correct exported name for `export function` and `export class`
            if (node.type === 'ExportLocalDeclaration' &&
                node.declaration !== undefined &&
                (node.declaration.type === 'FunctionDeclaration' ||
                    node.declaration.type === 'ClassDeclaration')) {
                const newName = replaceNodesWithName.get(node.declaration.id);
                if (newName !== undefined) {
                    replaced.add(node.declaration.id);
                    const oldName = node.declaration.id.name;
                    return [
                        node.declaration,
                        js_ast_1.exportLocalDeclaration.create({
                            specifiers: [
                                js_ast_1.exportLocalSpecifier.create({
                                    loc: node.declaration.id.loc,
                                    local: js_ast_1.referenceIdentifier.quick(newName),
                                    exported: js_ast_1.identifier.quick(oldName),
                                }),
                            ],
                        }),
                    ];
                }
            }
            // Retain the correct exported names for `export const`
            if (node.type === 'ExportLocalDeclaration' &&
                node.declaration !== undefined) {
                const bindings = getBindingIdentifiers_1.default(node.declaration);
                let includesAny = false;
                for (const node of bindings) {
                    if (replaceNodesWithName.has(node)) {
                        includesAny = true;
                        break;
                    }
                }
                if (includesAny) {
                    return [
                        node.declaration,
                        js_ast_1.exportLocalDeclaration.create({
                            specifiers: bindings.map((node) => {
                                let local = node.name;
                                const newName = replaceNodesWithName.get(node);
                                if (newName !== undefined) {
                                    local = newName;
                                    replaced.add(node);
                                }
                                return js_ast_1.exportLocalSpecifier.create({
                                    loc: node.loc,
                                    local: js_ast_1.referenceIdentifier.quick(local),
                                    exported: js_ast_1.identifier.quick(node.name),
                                });
                            }),
                        }),
                    ];
                }
            }
            if (isVariableIdentifier_1.default(node)) {
                const newName = replaceNodesWithName.get(node);
                if (newName !== undefined) {
                    replaced.add(node);
                    return {
                        ...node,
                        name: newName,
                        loc: inheritLoc_1.default(node, node.name),
                    };
                }
            }
            return node;
        },
    }, {
        noScopeCreation: true,
    });
    //
    if (replaced.size !== replaceNodesWithName.size) {
        console.log({ replaced, replaceNodesWithName });
        throw new Error('Missed some bindings');
    }
    return assertSingleOrMultipleNodes_1.default(renamedNode);
}
exports.default = renameBindings;
