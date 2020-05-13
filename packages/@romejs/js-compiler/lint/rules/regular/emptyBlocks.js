"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function isEmpty(node) {
    if (node.innerComments !== undefined && node.innerComments.length > 0) {
        return false;
    }
    if (node.type === 'EmptyStatement') {
        return true;
    }
    if (node.type === 'BlockStatement' && node.body.length === 0) {
        return true;
    }
    return false;
}
exports.default = {
    name: 'emptyBlocks',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'IfStatement') {
            if (isEmpty(node.consequent)) {
                context.addNodeDiagnostic(node.consequent, diagnostics_1.descriptions.LINT.EMPTY_BLOCKS);
            }
            if (node.alternate !== undefined && isEmpty(node.alternate)) {
                context.addNodeDiagnostic(node.alternate, diagnostics_1.descriptions.LINT.EMPTY_BLOCKS);
            }
        }
        return node;
    },
};
