"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const StringT_1 = require("../../types/StringT");
function StringKeywordTypeAnnotation(node, scope) {
    node = js_ast_1.stringKeywordTypeAnnotation.assert(node);
    return new StringT_1.default(scope, node);
}
exports.default = StringKeywordTypeAnnotation;
