"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ClassT_1 = require("../../types/ClassT");
function FlowDeclareClass(node, scope) {
    node = js_ast_1.flowDeclareClass.assert(node);
    const bodyScope = scope.fork();
    if (node.typeParameters) {
        bodyScope.evaluate(node.typeParameters);
    }
    const calls = [];
    const instances = [];
    const statics = [];
    for (const propNode of node.body.properties) {
        const prop = bodyScope.evaluate(propNode);
        if (propNode.type !== 'FlowObjectTypeSpreadProperty' &&
            propNode.static === true) {
            statics.push(prop);
        }
        else if (propNode.type === 'FlowObjectTypeCallProperty') {
            calls.push(scope.evaluate(propNode));
        }
        else {
            instances.push(prop);
        }
    }
    let xtends = undefined;
    if (node.extends.length > 0) {
        xtends = scope.evaluate(node.extends[0]);
    }
    const type = new ClassT_1.default(bodyScope, node.id, {
        _constructor: undefined,
        instances,
        statics,
        extends: xtends,
        calls,
    });
    scope.addBinding(node.id.name, type);
    type.setHuman(node.id.name);
    return type;
}
exports.default = FlowDeclareClass;
