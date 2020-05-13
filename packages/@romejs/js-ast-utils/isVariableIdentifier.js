"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isVariableIdentifier(node) {
    return (node.type === 'BindingIdentifier' ||
        node.type === 'AssignmentIdentifier' ||
        node.type === 'ReferenceIdentifier' ||
        node.type === 'JSXReferenceIdentifier');
}
exports.default = isVariableIdentifier;
