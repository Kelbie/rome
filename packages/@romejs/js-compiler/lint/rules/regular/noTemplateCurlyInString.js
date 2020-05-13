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
    name: 'noTemplateCurlyInString',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'StringLiteral') {
            const regex = /\$\{[^}]+\}/u;
            if (regex.test(node.value)) {
                context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_TEMPLATE_CURLY_IN_STRING);
            }
        }
        return node;
    },
};
