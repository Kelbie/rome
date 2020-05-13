"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const MaybeT_1 = require("../../types/MaybeT");
function FlowNullableTypeAnnotation(node, scope) {
    node = js_ast_1.flowNullableTypeAnnotation.assert(node);
    return new MaybeT_1.default(scope, node, scope.evaluate(node.typeAnnotation));
}
exports.default = FlowNullableTypeAnnotation;
