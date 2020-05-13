"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isIdentifierish(node) {
    return (node.type === 'Identifier' ||
        node.type === 'JSXIdentifier' ||
        node.type === 'JSXReferenceIdentifier' ||
        node.type === 'BindingIdentifier' ||
        node.type === 'AssignmentIdentifier' ||
        node.type === 'ReferenceIdentifier');
}
exports.default = isIdentifierish;
