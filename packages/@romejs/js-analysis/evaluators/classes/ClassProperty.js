"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scopes_1 = require("../../scopes");
const js_ast_1 = require("@romejs/js-ast");
const AnyT_1 = require("../../types/AnyT");
const ObjPropT_1 = require("../../types/ObjPropT");
function ClassProperty(node, scope) {
    node = js_ast_1.classProperty.assert(node);
    if (node.key.type === 'ComputedPropertyKey') {
        // TODO
        return undefined;
    }
    const classScope = scope.find(scopes_1.ClassScope);
    const funcScope = new scopes_1.ThisScope({ parentScope: scope }, classScope.meta.instance);
    let annotatedType;
    let inferredType;
    if (node.typeAnnotation) {
        annotatedType = funcScope.evaluate(node.typeAnnotation);
    }
    if (node.value) {
        inferredType = funcScope.evaluate(node.value);
        if (annotatedType !== undefined) {
            inferredType.shouldMatch(annotatedType);
        }
    }
    if (annotatedType === undefined && inferredType === undefined) {
        // TODO what do we do here?
        inferredType = new AnyT_1.default(scope, node);
    }
    const actualValue = annotatedType === undefined ? inferredType : annotatedType;
    if (actualValue === undefined) {
        throw new Error('Expected actual value');
    }
    if (node.key.value.type !== 'Identifier') {
        throw new Error('Expected only an identifier key');
    }
    return new ObjPropT_1.default(scope, node, node.key.value.name, actualValue);
}
exports.default = ClassProperty;
