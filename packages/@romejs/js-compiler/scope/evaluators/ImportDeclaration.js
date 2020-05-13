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
exports.default = {
    creator: false,
    build(node, parent, scope) {
        const source = node.source.value;
        for (const specifier of js_ast_utils_1.getImportSpecifiers(node)) {
            let kind = specifier.local.importKind || node.importKind || 'value';
            let meta;
            if (specifier.type === 'ImportNamespaceSpecifier') {
                meta = {
                    kind,
                    type: 'namespace',
                    source,
                };
            }
            else if (specifier.type === 'ImportDefaultSpecifier') {
                meta = {
                    kind,
                    type: 'name',
                    imported: 'default',
                    source,
                };
            }
            else if (specifier.type === 'ImportSpecifier') {
                meta = {
                    kind,
                    type: 'name',
                    imported: specifier.imported.name,
                    source,
                };
            }
            if (meta === undefined) {
                return;
            }
            scope.addBinding(new js_compiler_1.ImportBinding({
                node: specifier.local.name,
                name: specifier.local.name.name,
                scope,
            }, meta));
        }
    },
};
