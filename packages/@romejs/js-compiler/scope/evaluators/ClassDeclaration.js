"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const ClassExpression_1 = require("./ClassExpression");
exports.default = {
    creator: false,
    build(node, parent, scope) {
        if (node.id !== undefined) {
            scope.addBinding(new js_compiler_1.ClassBinding({
                name: node.id.name,
                node: node.id,
                scope,
            }));
        }
        return ClassExpression_1.default.build(node, parent, scope);
    },
};
