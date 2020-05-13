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
const InstanceT_1 = require("../../types/InstanceT");
const ClassT_1 = require("../../types/ClassT");
const OpenT_1 = require("../../types/OpenT");
function ClassExpression(node, scope) {
    node = node.type === 'ClassDeclaration' ? node : js_ast_1.classExpression.assert(node);
    const instances = [];
    const statics = [];
    //
    const classInstance = new OpenT_1.default(scope, node);
    const classId = new OpenT_1.default(scope, node);
    //
    const bodyScope = new scopes_1.ClassScope({ parentScope: scope }, {
        instance: classInstance,
        static: classId,
    });
    if (node.id !== undefined) {
        bodyScope.addBinding(node.id.name, classId);
    }
    if (node.meta.typeParameters !== undefined) {
        bodyScope.evaluate(node.meta.typeParameters);
    }
    let _constructor = undefined;
    for (const bodyNode of node.meta.body) {
        const type = bodyScope.evaluate(bodyNode);
        if (bodyNode.type === 'ClassMethod' && bodyNode.kind === 'constructor') {
            _constructor = type;
        }
        else {
            if (bodyNode.type !== 'TSIndexSignature' && bodyNode.meta.static === true) {
                statics.push(type);
            }
            else {
                instances.push(type);
            }
        }
    }
    //
    const classOrigin = node.id ? node.id : node;
    let type = new ClassT_1.default(scope, classOrigin, {
        _constructor,
        instances,
        statics,
        extends: node.meta.superClass
            ? scope.evaluate(node.meta.superClass)
            : undefined,
    });
    if (node.id) {
        type.setHuman(node.id.name);
    }
    //
    classId.shouldMatch(type);
    //
    const instance = new InstanceT_1.default(scope, classOrigin, type, []);
    classInstance.shouldMatch(instance);
    return type;
}
exports.default = ClassExpression;
