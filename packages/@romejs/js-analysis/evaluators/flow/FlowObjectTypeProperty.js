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
function FlowObjectTypeProperty(node, scope) {
    node = js_ast_1.flowObjectTypeProperty.assert(node);
    const { key, value } = node;
    let keyStr;
    if (key.type === 'Identifier') {
        keyStr = key.name;
    }
    else if (key.type === 'StringLiteral') {
        keyStr = key.value;
    }
    else {
        throw new Error('Unknown property key');
    }
    return new ObjPropT_1.default(scope, node, keyStr, scope.evaluate(value));
}
exports.default = FlowObjectTypeProperty;
