"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const js_ast_1 = require("@romejs/js-ast");
const ImportT_1 = require("../../types/ImportT");
function ExportLocalDeclaration(node, scope, { evaluator }) {
    node = js_ast_1.exportLocalDeclaration.assert(node);
    // export const foo = 'bar';
    // export default function foo() {}
    const decl = node.declaration;
    if (decl !== undefined) {
        const declType = scope.evaluate(decl);
        switch (decl.type) {
            case 'FunctionDeclaration':
            case 'ClassDeclaration': {
                const id = decl.id;
                if (id === undefined) {
                    throw new Error(`Expected id`);
                }
                evaluator.addExport(id.name, declType);
                break;
            }
            case 'VariableDeclarationStatement': {
                for (const id of js_ast_utils_1.getBindingIdentifiers(decl)) {
                    const type = scope.getBinding(id.name);
                    if (type === undefined) {
                        throw new Error(`Couldn't find binding type for ${id.name}`);
                    }
                    evaluator.addExport(id.name, type);
                }
                break;
            }
            case 'TypeAliasTypeAnnotation': {
                const type = scope.getBinding(decl.id.name);
                if (type === undefined) {
                    throw new Error(`Couldn't find binding type for ${decl.id.name}`);
                }
                evaluator.addExport(decl.id.name, type);
                break;
            }
        }
        return declType;
    }
    // export {foo, bar};
    // export {foo, bar} from './foo';
    const source = undefined; // TODO node.source === undefined ? undefined : node.source.value;
    const { specifiers } = node;
    if (specifiers !== undefined) {
        for (const specifier of specifiers) {
            if (specifier.type === 'ExportLocalSpecifier' ||
                specifier.type === 'ExportExternalSpecifier') {
                let type;
                if (source === undefined) {
                    type = scope.evaluate(specifier.local);
                }
                else {
                    type = new ImportT_1.default(scope, node, {
                        importedName: specifier.local.name,
                        source,
                    });
                }
                evaluator.addExport(specifier.exported.name, type);
            }
        }
    }
    return undefined;
}
exports.default = ExportLocalDeclaration;
