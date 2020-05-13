"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const ObjPropT_1 = require("../../types/ObjPropT");
const ObjT_1 = require("../../types/ObjT");
function ObjectExpression(node, scope) {
    node = js_ast_1.objectExpression.assert(node);
    const props = [];
    for (const prop of node.properties) {
        if (prop.type === 'SpreadProperty') {
            // TODO
        }
        else if (prop.type === 'ObjectProperty') {
            if (prop.key.type === 'ComputedPropertyKey') {
                // TODO
            }
            else {
                const { key: { value: key }, value, } = prop;
                let keyStr;
                if (key.type === 'Identifier') {
                    keyStr = key.name;
                }
                else {
                    // TODO
                    continue;
                }
                if (keyStr === undefined) {
                    throw new Error('Expected keyStr');
                }
                props.push(new ObjPropT_1.default(scope, prop, keyStr, scope.evaluate(value)));
            }
        }
        else {
            // TODO
        }
    }
    return new ObjT_1.default(scope, node, {
        calls: [],
        props,
        proto: scope.intrinsics.ObjectPrototype,
    });
}
exports.default = ObjectExpression;
