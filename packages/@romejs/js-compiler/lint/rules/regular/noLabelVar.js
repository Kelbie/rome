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
    name: 'noLabelVar',
    enter(path) {
        const { node, scope } = path;
        if (node.type === 'LabeledStatement') {
            const name = node.label.name;
            const binding = scope.getBinding(name);
            const isDefined = binding !== undefined || scope.getRootScope().isGlobal(name);
            if (isDefined) {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_LABEL_VAR);
            }
        }
        return node;
    },
};
