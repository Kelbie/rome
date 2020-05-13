"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ObjT_1 = require("../../types/ObjT");
function FlowObjectTypeAnnotation(node, scope) {
    node = js_ast_1.flowObjectTypeAnnotation.assert(node);
    const props = [];
    const calls = [];
    for (const prop of node.properties) {
        props.push(scope.evaluate(prop));
    }
    return new ObjT_1.default(scope, node, {
        props,
        proto: scope.intrinsics.ObjectPrototype,
        calls,
    });
}
exports.default = FlowObjectTypeAnnotation;
