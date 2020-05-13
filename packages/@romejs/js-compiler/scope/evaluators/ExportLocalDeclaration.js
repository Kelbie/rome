"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    creator: false,
    build(node, parent, scope) {
        const newScope = scope.evaluate(node.declaration, node);
        for (const id of js_ast_utils_1.getBindingIdentifiers(node)) {
            newScope.getBindingAssert(id.name).setExported(true);
        }
        return newScope;
    },
};
