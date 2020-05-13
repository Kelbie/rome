"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const isTypeNode_1 = require("./isTypeNode");
const isTypeExpressionWrapperNode_1 = require("./isTypeExpressionWrapperNode");
// Is this honestly the best heuristics?
function getTypeNode(path) {
    const { parent, parentPath } = path;
    if (parent === undefined || parentPath === undefined) {
        return undefined;
    }
    if (isTypeNode_1.default(parent)) {
        return parent;
    }
    if (isTypeNode_1.default(parentPath.parent)) {
        return parentPath.parent;
    }
    return undefined;
}
function isInTypeAnnotation(path) {
    const match = getTypeNode(path);
    if (match === undefined) {
        return false;
    }
    if (isTypeExpressionWrapperNode_1.default(match)) {
        return false;
    }
    else {
        return true;
    }
}
exports.default = isInTypeAnnotation;
