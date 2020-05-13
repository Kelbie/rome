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
        for (const id of js_ast_utils_1.getBindingIdentifiers(node)) {
            scope.addBinding(new js_compiler_1.TypeBinding({
                node: id,
                name: id.name,
                scope,
            }, node, 'parameter'));
        }
    },
};
