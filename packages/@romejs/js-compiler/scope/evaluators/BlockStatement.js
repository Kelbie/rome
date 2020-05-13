"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const utils_1 = require("../utils");
exports.default = {
    creator: true,
    build(node, parent, scope) {
        if (js_ast_utils_1.isFunctionNode(parent) && scope.node !== parent) {
            scope = scope.evaluate(parent.head, parent, true);
        }
        const newScope = scope.fork('block', node);
        if (js_ast_utils_1.isFunctionNode(parent) && parent.head.hasHoistedVars) {
            utils_1.addVarBindings(newScope, parent);
        }
        for (const child of node.body) {
            newScope.evaluate(child, node);
        }
        return newScope;
    },
};
