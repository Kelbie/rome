"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const CallT_1 = require("../../types/CallT");
function CallExpression(node, scope) {
    node = js_ast_1.callExpression.assert(node);
    return new CallT_1.default(scope, node, scope.evaluate(node.callee), node.arguments.map((arg) => {
        return scope.evaluate(arg);
    }));
}
exports.default = CallExpression;
