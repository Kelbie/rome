"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'paramlessCatch',
    enter(path) {
        const { node } = path;
        if (node.type === 'CatchClause' && node.param === undefined) {
            return {
                ...node,
                param: js_ast_1.bindingIdentifier.create({
                    name: path.scope.generateUid(),
                }),
            };
        }
        return node;
    },
};
