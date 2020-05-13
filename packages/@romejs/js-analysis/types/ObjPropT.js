"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class ObjPropT extends T_1.default {
    constructor(scope, originNode, key, value) {
        super(scope, originNode);
        this.key = key;
        this.value = value;
    }
    serialize(addType) {
        return {
            key: this.key,
            value: addType(this.value),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new ObjPropT(scope, originNode, String(data.key), getType(data.value));
    }
    compatibleWith(otherType) {
        if (otherType instanceof ObjPropT && otherType.key === this.key) {
            return this.utils.checkCompability(this.value, otherType.value);
        }
        else {
            return false;
        }
    }
    humanize(builder) {
        return `${this.key}: ${builder.humanize(this.value)}`;
    }
}
exports.default = ObjPropT;
ObjPropT.type = 'ObjPropT';
