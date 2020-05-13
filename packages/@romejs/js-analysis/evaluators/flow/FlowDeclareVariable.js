"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
function FlowDeclareVariable(node, scope) {
    node = js_ast_1.flowDeclareVariable.assert(node);
    const { id } = node;
    if (id.meta === undefined) {
        throw new Error('TODO');
    }
    const type = scope.evaluate(id.meta.typeAnnotation);
    scope.addBinding(id.name, type);
    return type;
}
exports.default = FlowDeclareVariable;
