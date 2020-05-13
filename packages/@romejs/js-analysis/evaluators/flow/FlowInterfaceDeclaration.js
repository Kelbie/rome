"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
function FlowInterfaceDeclaration(node, scope) {
    node =
        node.type === 'FlowDeclareInterface'
            ? node
            : js_ast_1.flowInterfaceDeclaration.assert(node);
    const typeScope = scope.fork();
    if (node.typeParameters) {
        typeScope.evaluate(node.typeParameters);
    }
    // TODO extends
    const body = typeScope.evaluate(node.body);
    scope.addBinding(node.id.name, body);
    return body;
}
exports.default = FlowInterfaceDeclaration;
