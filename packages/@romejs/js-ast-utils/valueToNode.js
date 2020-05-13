"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const createPropertyKey_1 = require("./createPropertyKey");
function valueToNode(value, ancestry = []) {
    if (ancestry.includes(value)) {
        throw new Error('Recursion detected');
    }
    switch (typeof value) {
        case 'string':
            return js_ast_1.stringLiteral.quick(value);
        case 'boolean':
            return js_ast_1.booleanLiteral.quick(value);
        case 'number':
            return js_ast_1.numericLiteral.quick(value);
        case 'undefined':
            return js_ast_1.referenceIdentifier.quick('undefined');
        case 'object': {
            if (value === null) {
                return js_ast_1.nullLiteral.create({});
            }
            const subAncestry = [...ancestry, value];
            if (Array.isArray(value)) {
                return js_ast_1.arrayExpression.quick(value.map((elem) => valueToNode(elem, subAncestry)));
            }
            const obj = value;
            const props = [];
            for (let key in obj) {
                props.push(js_ast_1.objectProperty.create({
                    key: js_ast_1.staticPropertyKey.create({
                        value: createPropertyKey_1.default(key),
                    }),
                    value: valueToNode(obj[key], subAncestry),
                }));
            }
            return js_ast_1.objectExpression.quick(props);
        }
        default:
            throw new Error('Do not know how to turn this value into a literal');
    }
}
exports.default = valueToNode;
