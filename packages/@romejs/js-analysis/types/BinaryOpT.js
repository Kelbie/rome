"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const NumericLiteralT_1 = require("./NumericLiteralT");
const NumericT_1 = require("./NumericT");
const BooleanT_1 = require("./BooleanT");
const StringT_1 = require("./StringT");
const AnyT_1 = require("./AnyT");
const StringLiteralT_1 = require("./StringLiteralT");
function isNumber(t) {
    return t instanceof NumericT_1.default || t instanceof NumericLiteralT_1.default;
}
class BinaryOpT extends T_1.default {
    constructor(scope, originNode, left, operator, right) {
        super(scope, originNode);
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
    serialize(addType) {
        return {
            left: addType(this.left),
            right: addType(this.right),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new BinaryOpT(scope, originNode, getType(data.left), String(data.operator), getType(data.right));
    }
    reduce() {
        const left = this.utils.reduce(this.left);
        const right = this.utils.reduce(this.right);
        const { scope, originNode, operator } = this;
        // return type
        switch (operator) {
            case // returns booleans
             '===':
            case '==':
            case '!=':
            case '!==':
            case '<':
            case '<=':
            case '>':
            case '>=':
            case 'in':
            case 'instanceof':
                // TODO return BooleanLiteralT in the cases whe we have all the info
                return new BooleanT_1.default(scope, originNode);
            // Returns a string or a number
            case '+':
                if (left instanceof AnyT_1.default || right instanceof AnyT_1.default) {
                    return new AnyT_1.default(scope, originNode);
                }
                else if (left instanceof NumericLiteralT_1.default &&
                    right instanceof NumericLiteralT_1.default) {
                    return new NumericLiteralT_1.default(scope, originNode, left.value + right.value);
                }
                else if (isNumber(left) && isNumber(right)) {
                    return new NumericT_1.default(scope, originNode);
                }
                else if (left instanceof StringLiteralT_1.default &&
                    right instanceof StringLiteralT_1.default) {
                    return new StringLiteralT_1.default(scope, originNode, left.value + right.value);
                }
                else {
                    return new StringT_1.default(scope, originNode);
                }
            // returns a number
            case '<<':
            case '>>':
            case '>>>':
            case '-':
            case '*':
            case '/':
            case '%':
            case '**':
            case '|':
            case '^':
            case '&':
                // TODO return NumericLiteralT if left/right are literals too
                return new NumericT_1.default(scope, originNode);
            default:
                throw new Error('Unknown operator');
        }
    }
}
exports.default = BinaryOpT;
BinaryOpT.type = 'BinaryOpT';
