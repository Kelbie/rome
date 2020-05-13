"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const OpenT_1 = require("../../types/OpenT");
const VoidT_1 = require("../../types/VoidT");
const executeAtom_1 = require("../../utils/executeAtom");
function VariableDeclaration(node, scope) {
    node = js_ast_1.variableDeclaration.assert(node);
    for (const declarator of node.declarations) {
        const { id, init } = declarator;
        let inferredType;
        if (init === undefined) {
            inferredType = new OpenT_1.default(scope, declarator);
            inferredType.shouldMatch(new VoidT_1.default(scope, declarator));
        }
        else {
            inferredType = scope.evaluate(init);
        }
        let actualType = inferredType;
        if (id.meta !== undefined && id.meta.typeAnnotation !== undefined) {
            const annotatedType = scope.evaluate(id.meta.typeAnnotation);
            inferredType.shouldMatch(annotatedType);
            actualType = annotatedType;
        }
        executeAtom_1.default(id, actualType, scope);
    }
}
exports.default = VariableDeclaration;
