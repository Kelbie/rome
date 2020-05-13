"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ImportT_1 = require("../../types/ImportT");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function ImportDeclaration(node, scope) {
    node = js_ast_1.importDeclaration.assert(node);
    const source = node.source.value;
    for (const specifier of js_ast_utils_1.getImportSpecifiers(node)) {
        if (specifier.type === 'ImportSpecifier') {
            const localName = specifier.local.name.name;
            const importedName = specifier.imported.name;
            const open = new ImportT_1.default(scope, specifier, {
                importedName,
                source,
            });
            scope.addBinding(localName, open);
        }
        else if (specifier.type === 'ImportDefaultSpecifier') {
            const localName = specifier.local.name.name;
            const open = new ImportT_1.default(scope, specifier, {
                importedName: 'default',
                source,
            });
            scope.addBinding(localName, open);
        }
        else if (specifier.type === 'ImportNamespaceSpecifier') {
            const localName = specifier.local.name.name;
            const open = new ImportT_1.default(scope, specifier, {
                importedName: undefined,
                source,
            });
            scope.addBinding(localName, open);
        }
        else {
            // TODO error
        }
    }
}
exports.default = ImportDeclaration;
