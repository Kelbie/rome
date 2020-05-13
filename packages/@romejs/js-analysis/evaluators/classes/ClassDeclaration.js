"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ClassExpression_1 = require("./ClassExpression");
function ClassDeclaration(node, scope) {
    node = js_ast_1.classDeclaration.assert(node);
    const type = ClassExpression_1.default(node, scope);
    if (node.id) {
        scope.addBinding(node.id.name, type);
    }
    return type;
}
exports.default = ClassDeclaration;
