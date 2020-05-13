"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const StringLiteralT_1 = require("../../types/StringLiteralT");
const GetPropT_1 = require("../../types/GetPropT");
function MemberExpression(node, scope) {
    node = js_ast_1.memberExpression.assert(node);
    if (node.property.type === 'ComputedMemberProperty') {
        throw new Error('Computed properties not supportd yet');
    }
    if (node.property.value.type === 'PrivateName') {
        throw new Error('PrivateName in static member not supported yet');
    }
    const prop = new StringLiteralT_1.default(scope, node.property.value, node.property.value.name);
    return new GetPropT_1.default(scope, node, scope.evaluate(node.object), prop);
}
exports.default = MemberExpression;
