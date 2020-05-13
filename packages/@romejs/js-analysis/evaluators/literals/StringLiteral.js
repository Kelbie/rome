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
function StringLiteral(node, scope) {
    node = js_ast_1.stringLiteral.assert(node);
    return new StringLiteralT_1.default(scope, node, node.value);
}
exports.default = StringLiteral;
