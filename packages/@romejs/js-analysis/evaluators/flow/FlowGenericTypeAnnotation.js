"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const GenericT_1 = require("../../types/GenericT");
function getName(node) {
    if (node.type === 'Identifier' || node.type === 'ReferenceIdentifier') {
        return node.name;
    }
    else {
        return `${getName(node.id)}.${getName(node.qualification)}`;
    }
}
function FlowGenericTypeAnnotation(node, scope) {
    node = js_ast_1.flowGenericTypeAnnotation.assert(node);
    //if (node.typeParameters) {
    //  // TODO execute type params
    //  return new InstanceT(scope, node, node.id.name, scope.evaluate(node.id), []);
    //} else {
    return new GenericT_1.default(scope, node, getName(node.id), scope.evaluate(node.id));
    //}
}
exports.default = FlowGenericTypeAnnotation;
