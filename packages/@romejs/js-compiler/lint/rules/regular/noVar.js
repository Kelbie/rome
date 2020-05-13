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
    name: 'noVar',
    enter(path) {
        const { context, node: declaration } = path;
        if (declaration.type === 'VariableDeclaration' && declaration.kind === 'var') {
            context.addNodeDiagnostic(declaration, diagnostics_1.descriptions.LINT.NO_VAR);
        }
        return declaration;
    },
};
