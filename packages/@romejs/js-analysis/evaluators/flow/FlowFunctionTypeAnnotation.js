"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const FunctionT_1 = require("../../types/FunctionT");
const MaybeT_1 = require("../../types/MaybeT");
function FlowFunctionTypeAnnotation(node, scope) {
    node = js_ast_1.flowFunctionTypeAnnotation.assert(node);
    const bodyScope = scope.fork();
    if (node.typeParameters) {
        bodyScope.evaluate(node.typeParameters);
    }
    // build param types
    const params = [];
    let rest;
    for (const paramNode of node.params) {
        let paramType = bodyScope.evaluate(paramNode.meta.typeAnnotation);
        if (paramNode.meta.optional === true) {
            paramType = new MaybeT_1.default(scope, paramNode, paramType);
        }
        params.push(paramType);
    }
    if (node.rest !== undefined) {
        rest = bodyScope.evaluate(node.rest.meta.typeAnnotation);
    }
    // build return type
    const returns = bodyScope.evaluate(node.returnType);
    // create the function
    return new FunctionT_1.default(scope, node, { params, rest, returns, body: undefined });
}
exports.default = FlowFunctionTypeAnnotation;
