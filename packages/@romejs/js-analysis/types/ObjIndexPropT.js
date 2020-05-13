"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class ObjIndexPropT extends T_1.default {
    constructor(scope, originNode, key, value) {
        super(scope, originNode);
        this.key = key;
        this.value = value;
    }
    serialize(addType) {
        return {
            key: addType(this.key),
            value: addType(this.value),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new ObjIndexPropT(scope, originNode, getType(data.key), getType(data.value));
    }
    humanize(builder) {
        return `[${builder.humanize(this.key)}]: ${builder.humanize(this.value)}`;
    }
}
exports.default = ObjIndexPropT;
ObjIndexPropT.type = 'ObjIndexPropT';
