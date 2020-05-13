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
    name: 'stylePropObject',
    enter(path) {
        const { node } = path;
        if (node.type === 'JSXAttribute' &&
            node.name.name === 'style' &&
            node.value !== undefined &&
            ((node.value.type === 'JSXExpressionContainer' &&
                node.value.expression.type !== 'ObjectExpression') ||
                node.value.type !== 'JSXExpressionContainer')) {
            path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.STYLE_PROP_OBJECT);
        }
        return node;
    },
};
