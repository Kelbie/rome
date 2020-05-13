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
const StringT_1 = require("../../types/StringT");
function TemplateLiteral(node, scope) {
    node = js_ast_1.templateLiteral.assert(node);
    for (const expr of node.expressions) {
        new ExhaustiveT_1.default(scope, expr, scope.evaluate(expr), new StringT_1.default(scope, undefined));
    }
    return new StringT_1.default(scope, node);
}
exports.default = TemplateLiteral;
