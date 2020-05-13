"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'optimizeExports',
    enter(path) {
        const { node } = path;
        // turn `import {a} from 'b'; export {a}`; to `export {a} from 'b';`';
        if (node.type === 'ExportLocalDeclaration' &&
            node.exportKind === 'value' &&
            node.declaration === undefined &&
            node.specifiers !== undefined) {
            const nodes = [];
            const specifiers = [];
            for (const specifier of node.specifiers) {
                if (specifier.type === 'ExportLocalSpecifier') {
                    const binding = path.scope.getBinding(specifier.local.name);
                    if (binding !== undefined &&
                        binding instanceof js_compiler_1.ImportBinding &&
                        binding.meta.type === 'name') {
                        nodes.push(js_ast_1.exportExternalDeclaration.create({
                            namedSpecifiers: [
                                js_ast_1.exportExternalSpecifier.create({
                                    local: js_ast_1.identifier.quick(binding.meta.imported),
                                    exported: specifier.exported,
                                    loc: specifier.loc,
                                }),
                            ],
                            source: js_ast_1.stringLiteral.quick(binding.meta.source),
                        }));
                    }
                    else {
                        specifiers.push(specifier);
                    }
                }
                else {
                    // TODO ???
                    specifiers.push(specifier);
                }
            }
            if (specifiers.length === node.specifiers.length && nodes.length === 0) {
                return node;
            }
            if (specifiers.length !== 0) {
                nodes.push(js_ast_1.exportLocalDeclaration.create({ specifiers }));
            }
            return nodes;
        }
        return node;
    },
};
