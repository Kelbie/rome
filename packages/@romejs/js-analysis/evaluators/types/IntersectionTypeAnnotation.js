"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const IntersectionT_1 = require("../../types/IntersectionT");
function IntersectionTypeAnnotation(node, scope) {
    node = js_ast_1.intersectionTypeAnnotation.assert(node);
    return new IntersectionT_1.default(scope, node, node.types.map((type) => {
        return scope.evaluate(type);
    }));
}
exports.default = IntersectionTypeAnnotation;
