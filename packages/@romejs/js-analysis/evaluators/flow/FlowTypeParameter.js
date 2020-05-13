"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const AnyT_1 = require("../../types/AnyT");
function FlowTypeParameter(node, scope) {
    node = js_ast_1.flowTypeParameter.assert(node);
    const type = new AnyT_1.default(scope, node);
    scope.addBinding(node.name, type);
    return type;
}
exports.default = FlowTypeParameter;
