"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const NullT_1 = require("../../types/NullT");
function NullLiteral(node, scope) {
    node = node = js_ast_1.nullLiteral.assert(node);
    return new NullT_1.default(scope, node);
}
exports.default = NullLiteral;
