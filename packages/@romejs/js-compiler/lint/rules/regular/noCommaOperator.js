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
    name: 'noCommaOperator',
    enter(path) {
        const { node } = path;
        if (node.type === 'SequenceExpression') {
            path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_COMMA_OPERATOR);
        }
        return node;
    },
};
