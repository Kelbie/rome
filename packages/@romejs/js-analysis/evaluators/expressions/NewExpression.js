"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const InstanceT_1 = require("../../types/InstanceT");
function NewExpression(node, scope) {
    node = js_ast_1.newExpression.assert(node);
    return new InstanceT_1.default(scope, node, scope.evaluate(node.callee), []);
}
exports.default = NewExpression;
