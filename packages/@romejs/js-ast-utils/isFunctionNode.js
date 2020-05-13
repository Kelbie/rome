"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isFunctionNode(node) {
    return (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ObjectMethod' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'ClassMethod');
}
exports.default = isFunctionNode;
