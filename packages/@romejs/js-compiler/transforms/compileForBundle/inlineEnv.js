"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const js_ast_1 = require("@romejs/js-ast");
exports.default = {
    name: 'inlineEnv',
    enter(path) {
        const { node } = path;
        if (node.type === 'MemberExpression' &&
            node.property.value.type === 'Identifier' &&
            node.property.value.name === 'NODE_ENV' &&
            !path.scope.hasBinding('process') &&
            js_ast_utils_1.doesNodeMatchPattern(node, 'process.env.NODE_ENV')) {
            return js_ast_1.stringLiteral.create({
                value: 'development',
            });
        }
        return node;
    },
};
