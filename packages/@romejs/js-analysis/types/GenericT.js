"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const ClassT_1 = require("./ClassT");
const InstanceT_1 = require("./InstanceT");
class GenericT extends T_1.default {
    constructor(scope, originNode, name, type) {
        super(scope, originNode);
        this.name = name;
        this.type = type;
    }
    serialize(addType) {
        return {
            name: this.name,
            type: addType(this.type),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new GenericT(scope, originNode, String(data.name), getType(data.type));
    }
    humanize() {
        return this.name;
    }
    reduce() {
        const type = this.utils.reduce(this.type);
        if (type instanceof ClassT_1.default) {
            return new InstanceT_1.default(this.scope, this.originNode, this.type, []);
        }
        else {
            return type;
        }
    }
}
exports.default = GenericT;
GenericT.type = 'GenericT';
