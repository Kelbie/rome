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
const ObjPropT_1 = require("../../types/ObjPropT");
const executeFunction_1 = require("../../utils/executeFunction");
function ClassMethod(node, scope) {
    node = js_ast_1.classMethod.assert(node);
    if (node.key.type === 'ComputedPropertyKey' === true) {
        // TODO
        return undefined;
    }
    const classScope = scope.find(scopes_1.ClassScope);
    const thisContext = node.meta.static === true
        ? classScope.meta.static
        : classScope.meta.instance;
    const func = executeFunction_1.default(node, scope, false, thisContext);
    if (node.key.value.type !== 'Identifier') {
        throw new Error('Expected only an identifier key');
    }
    return new ObjPropT_1.default(scope, node, node.key.value.name, func);
}
exports.default = ClassMethod;
