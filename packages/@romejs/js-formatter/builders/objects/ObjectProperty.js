"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function isShorthand(key, value) {
    return (key.type === 'StaticPropertyKey' &&
        key.value.type === 'Identifier' &&
        (value.type === 'ReferenceIdentifier' ||
            value.type === 'BindingIdentifier' ||
            value.type === 'AssignmentIdentifier') &&
        value.name === key.value.name);
}
function ObjectProperty(builder, node) {
    const tokens = [builder.tokenize(node.key, node)];
    if ((node.value.type === 'BindingAssignmentPattern' ||
        node.value.type === 'AssignmentAssignmentPattern') &&
        isShorthand(node.key, node.value.left)) {
        return tokens_1.concat([
            tokens_1.concat(tokens),
            tokens_1.space,
            '=',
            tokens_1.space,
            builder.tokenize(node.value.right, node.value),
        ]);
    }
    else if (isShorthand(node.key, node.value)) {
        return tokens_1.concat(tokens);
    }
    else {
        return tokens_1.concat([
            tokens_1.concat(tokens),
            ':',
            tokens_1.space,
            builder.tokenize(node.value, node),
        ]);
    }
}
exports.default = ObjectProperty;
