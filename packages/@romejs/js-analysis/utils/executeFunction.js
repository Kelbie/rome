"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scopes_1 = require("../scopes");
const executeAtom_1 = require("./executeAtom");
const FunctionT_1 = require("../types/FunctionT");
const MaybeT_1 = require("../types/MaybeT");
const VoidT_1 = require("../types/VoidT");
const OpenT_1 = require("../types/OpenT");
function executeFunction(node, scope, bindId, thisContext) {
    const { head } = node;
    // build return type
    const returns = new OpenT_1.default(scope, head.returnType ? head.returnType : node);
    // type check the body
    const bodyScope = new scopes_1.FunctionScope({
        parentScope: scope,
    }, {
        thisContext: thisContext ? thisContext : new VoidT_1.default(scope, undefined),
        returnType: returns,
    });
    if (head.typeParameters) {
        bodyScope.evaluate(head.typeParameters);
    }
    // build param types
    const params = [];
    let rest;
    for (let paramNode of head.params) {
        let optional = paramNode.meta !== undefined && paramNode.meta.optional === true;
        if (paramNode.type === 'BindingAssignmentPattern') {
            optional = false;
            paramNode = paramNode.left;
        }
        let paramType;
        if (paramNode.meta !== undefined &&
            paramNode.meta.typeAnnotation !== undefined) {
            paramType = scope.evaluate(paramNode.meta.typeAnnotation);
        }
        else {
            paramType = new OpenT_1.default(scope, paramNode);
        }
        if (optional) {
            paramType = new MaybeT_1.default(scope, paramNode, paramType);
        }
        params.push(paramType);
    }
    for (let i = 0; i < head.params.length; i++) {
        executeAtom_1.default(head.params[i], params[i], scope);
    }
    const block = bodyScope.evaluate(node.body);
    // if no types have flowed into the return type then it'll return undefined
    if (returns.hasConnections() === false) {
        //const ret = new VoidT(scope, node);
        //returns.shouldMatch(ret);
    }
    if (head.returnType) {
        returns.shouldMatch(scope.evaluate(head.returnType));
    }
    // create the function
    const func = new FunctionT_1.default(scope, node, { params, rest, returns, body: block });
    return func;
}
exports.default = executeFunction;
