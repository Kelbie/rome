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
const OpenT_1 = require("../../types/OpenT");
function ArrayExpression(node, scope) {
    node = js_ast_1.arrayExpression.assert(node);
    const elems = [];
    for (const expr of node.elements) {
        if (expr === undefined) {
            // TODO array hole, add undefined here
        }
        else {
            elems.push(scope.evaluate(expr));
        }
    }
    let value;
    if (elems.length === 0) {
        value = new OpenT_1.default(scope, node);
    }
    else {
        value = scope.createUnion(elems, node);
    }
    return new InstanceT_1.default(scope, node, scope.intrinsics.Array, [value]);
}
exports.default = ArrayExpression;
