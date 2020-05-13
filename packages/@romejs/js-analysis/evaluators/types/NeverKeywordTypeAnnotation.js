"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
function NeverKeywordTypeAnnotation(node) {
    node = js_ast_1.neverKeywordTypeAnnotation.assert(node);
    throw new Error('unimplemented');
}
exports.default = NeverKeywordTypeAnnotation;
