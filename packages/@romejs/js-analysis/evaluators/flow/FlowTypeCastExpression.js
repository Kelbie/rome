"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ExhaustiveT_1 = require("../../types/ExhaustiveT");
function FlowTypeCastExpression(node, scope) {
    node = js_ast_1.flowTypeCastExpression.assert(node);
    const expressionType = scope.evaluate(node.expression);
    const assertedType = scope.evaluate(node.typeAnnotation);
    new ExhaustiveT_1.default(scope, node, expressionType, assertedType);
    return assertedType;
}
exports.default = FlowTypeCastExpression;
