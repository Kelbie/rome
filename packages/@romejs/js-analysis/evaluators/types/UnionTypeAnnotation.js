"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const UnionT_1 = require("../../types/UnionT");
function UnionTypeAnnotation(node, scope) {
    node = js_ast_1.unionTypeAnnotation.assert(node);
    return new UnionT_1.default(scope, node, node.types.map((type) => {
        return scope.evaluate(type);
    }));
}
exports.default = UnionTypeAnnotation;
