"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const BooleanT_1 = require("../../types/BooleanT");
const NumericT_1 = require("../../types/NumericT");
const VoidT_1 = require("../../types/VoidT");
const TypeofT_1 = require("../../types/TypeofT");
function UnaryExpression(node, scope) {
    node = js_ast_1.unaryExpression.assert(node);
    const argType = scope.evaluate(node.argument);
    switch (node.operator) {
        case // booleans
         'delete':
        case '!':
            return new BooleanT_1.default(scope, node);
        // numbers
        case '+':
        case '-':
        case '~':
            return new NumericT_1.default(scope, node);
        // strings
        case 'typeof':
            return new TypeofT_1.default(scope, node, argType);
        // void
        case 'void':
            return new VoidT_1.default(scope, node);
        // empty!
        case 'throw':
            break;
    }
    return undefined;
}
exports.default = UnaryExpression;
