"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
function ExportDefaultDeclaration(node, scope, { evaluator }) {
    node = js_ast_1.exportDefaultDeclaration.assert(node);
    const decl = node.declaration;
    const declType = scope.evaluate(decl);
    evaluator.addExport('default', declType);
    return declType;
}
exports.default = ExportDefaultDeclaration;
