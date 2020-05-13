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
    name: 'noExplicitAny',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'AnyKeywordTypeAnnotation') {
            context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_EXPLICIT_ANY);
        }
        return node;
    },
};
