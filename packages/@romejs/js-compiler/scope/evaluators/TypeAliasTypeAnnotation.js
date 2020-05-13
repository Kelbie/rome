"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
exports.default = {
    creator: false,
    build(node, parent, scope) {
        scope.evaluate(node.typeParameters);
        scope.addBinding(new js_compiler_1.TypeBinding({
            node: node.id,
            name: node.id.name,
            scope,
        }, node, 'typealias'));
    },
};
