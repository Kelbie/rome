"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const doesNodeMatchPattern_1 = require("./doesNodeMatchPattern");
function getRequireSource(node, scope, allowStaticMember = false) {
    if (node === undefined) {
        return undefined;
    }
    if (allowStaticMember &&
        node.type === 'MemberExpression' &&
        node.property.type === 'StaticMemberProperty') {
        node = node.object;
    }
    if (node.type !== 'CallExpression') {
        return undefined;
    }
    const { arguments: args, callee } = node;
    const [firstArg] = args;
    if (args.length !== 1 || firstArg.type !== 'StringLiteral') {
        return undefined;
    }
    const validRequireCallee = callee.type === 'ReferenceIdentifier' &&
        callee.name === 'require' &&
        scope.getBinding('require') === undefined;
    const validRomeRequreCallee = (doesNodeMatchPattern_1.default(callee, 'Rome.requireDefault') ||
        doesNodeMatchPattern_1.default(callee, 'Rome.requireNamespace')) &&
        scope.getBinding('Rome') === undefined;
    if (validRequireCallee || validRomeRequreCallee) {
        return firstArg.value;
    }
    return undefined;
}
exports.default = getRequireSource;
