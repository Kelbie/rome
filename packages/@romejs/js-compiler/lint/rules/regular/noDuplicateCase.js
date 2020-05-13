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
    name: 'noDuplicateCase',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'SwitchStatement') {
            const uniqueSwitchCases = new Set();
            for (const param of node.cases) {
                if (param.test && param.test.type === 'StringLiteral') {
                    const { test } = param;
                    if (uniqueSwitchCases.has(test.value)) {
                        context.addNodeDiagnostic(test, diagnostics_1.descriptions.LINT.NO_DUPLICATE_CASE(test.value));
                    }
                    uniqueSwitchCases.add(test.value);
                }
            }
        }
        return node;
    },
};
