"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    name: 'scopedRome',
    enter(path) {
        const { node, scope } = path;
        if (scope.node === node && scope.hasBinding('Rome')) {
            return js_ast_utils_1.renameBindings(path, new Map([['Rome', scope.generateUid('Rome')]]));
        }
        return node;
    },
};
