"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noCondAssign',
    enter(path) {
        const { node } = path;
        if ((node.type === 'IfStatement' ||
            node.type === 'ForStatement' ||
            node.type === 'WhileStatement' ||
            node.type === 'DoWhileStatement') &&
            node.test &&
            node.test.type === 'AssignmentExpression') {
            path.context.addNodeDiagnostic(node.test, diagnostics_1.descriptions.LINT.NO_COND_ASSIGN);
        }
        return node;
    },
};
