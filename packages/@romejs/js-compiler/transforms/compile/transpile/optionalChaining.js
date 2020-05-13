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
    name: 'optionalChaining',
    enter(path) {
        const { node } = path;
        if (node.type === 'MemberExpression' && node.property.optional) {
            // TODO assign `node.object` to a variable and use it as a reference
            if (node.property.type === 'ComputedMemberProperty') {
                return js_ast_utils_1.template.expression `${node.object} == null ? undefined : ${node.object}[${node.property.value}]`;
            }
            else {
                return js_ast_utils_1.template.expression `${node.object} == null ? undefined : ${node.object}.${node.property.value}`;
            }
        }
        if (node.type === 'OptionalCallExpression') {
            // TODO assign `node.callee` to a variable and use it as a reference
            return js_ast_utils_1.template.expression `${node.callee} == null ? undefined : ${js_ast_1.callExpression.create({
                callee: node.callee,
                arguments: node.arguments,
            })}`;
        }
        return node;
    },
};
