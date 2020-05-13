"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const NumericLiteralT_1 = require("../types/NumericLiteralT");
const StringLiteralT_1 = require("../types/StringLiteralT");
const GetPropT_1 = require("../types/GetPropT");
function executeAtom(leftNode, rightType, scope) {
    switch (leftNode.type) {
        case 'BindingIdentifier': {
            scope.addBinding(leftNode.name, rightType);
            break;
        }
        case 'BindingObjectPattern': {
            for (const prop of leftNode.properties) {
                executeAtom(prop, rightType, scope);
            }
            break;
        }
        case 'BindingObjectPatternProperty': {
            const { key } = leftNode;
            if (key.type === 'ComputedPropertyKey' || key.value.type !== 'Identifier') {
                throw new Error('unimplemented');
            }
            const propKey = new StringLiteralT_1.default(scope, key, key.value.name);
            const getProp = new GetPropT_1.default(scope, leftNode, rightType, propKey);
            executeAtom(leftNode.value, getProp, scope);
            break;
        }
        case 'BindingArrayPattern': {
            for (let i = 0; i < leftNode.elements.length; i++) {
                const elem = leftNode.elements[i];
                if (elem === undefined) {
                    continue;
                }
                const propKey = new NumericLiteralT_1.default(scope, elem, i);
                const getProp = new GetPropT_1.default(scope, leftNode, rightType, propKey);
                executeAtom(elem, getProp, scope);
            }
            break;
        }
        case 'BindingAssignmentPattern': {
            executeAtom(leftNode.left, rightType, scope);
            break;
        }
    }
}
exports.default = executeAtom;
