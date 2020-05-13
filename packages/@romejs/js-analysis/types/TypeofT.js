"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const StringLiteralT_1 = require("./StringLiteralT");
const NumericLiteralT_1 = require("./NumericLiteralT");
const BooleanLiteralT_1 = require("./BooleanLiteralT");
const StringT_1 = require("./StringT");
const BooleanT_1 = require("./BooleanT");
const NumericT_1 = require("./NumericT");
const NullT_1 = require("./NullT");
const ObjT_1 = require("./ObjT");
const VoidT_1 = require("./VoidT");
const T_1 = require("./T");
class TypeofT extends T_1.default {
    constructor(scope, node, obj) {
        super(scope, node);
        this.obj = obj;
    }
    reduce() {
        const types = this.utils.explodeUnion(this.obj);
        const possibleTypes = [];
        for (const rawType of types) {
            const type = this.utils.reduce(rawType);
            let typeStr;
            if (type instanceof StringT_1.default || type instanceof StringLiteralT_1.default) {
                typeStr = 'string';
            }
            if (type instanceof NumericT_1.default || type instanceof NumericLiteralT_1.default) {
                typeStr = 'number';
            }
            if (type instanceof BooleanT_1.default || type instanceof BooleanLiteralT_1.default) {
                typeStr = 'boolean';
            }
            if (type instanceof VoidT_1.default) {
                typeStr = 'undefined';
            }
            if (type instanceof ObjT_1.default) {
                if (type.calls.length === 0) {
                    typeStr = 'object';
                }
                else {
                    typeStr = 'function';
                }
            }
            if (type instanceof NullT_1.default) {
                typeStr = 'object';
            }
            // TODO symbol
            // TODO bigint
            if (typeStr !== undefined) {
                possibleTypes.push(new StringLiteralT_1.default(this.scope, this.originNode, typeStr));
            }
        }
        if (possibleTypes.length === 0) {
            return new StringT_1.default(this.scope, this.originNode);
        }
        else {
            return this.scope.createUnion(possibleTypes, this.originNode);
        }
    }
}
exports.default = TypeofT;
TypeofT.type = 'TypeofT';
