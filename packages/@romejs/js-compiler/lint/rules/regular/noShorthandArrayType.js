"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noShorthandArrayType',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'TSArrayType') {
            return context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.tsTypeReference.create({
                    typeName: js_ast_1.referenceIdentifier.quick('Array'),
                    typeParameters: js_ast_1.tsTypeParameterInstantiation.create({
                        params: [node.elementType],
                    }),
                }),
            }, diagnostics_1.descriptions.LINT.NO_SHORTHAND_ARRAY_TYPE);
        }
        if (node.type === 'FlowArrayTypeAnnotation') {
            return context.addFixableDiagnostic({
                old: node,
                fixed: js_ast_1.flowGenericTypeAnnotation.create({
                    id: js_ast_1.referenceIdentifier.quick('Array'),
                    typeParameters: js_ast_1.flowTypeParameterInstantiation.create({
                        params: [node.elementType],
                    }),
                }),
            }, diagnostics_1.descriptions.LINT.NO_SHORTHAND_ARRAY_TYPE);
        }
        return node;
    },
};
