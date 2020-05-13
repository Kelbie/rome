"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class OpaqueT extends T_1.default {
    constructor(scope, originNode, name) {
        super(scope, originNode);
        this.name = name;
    }
    serialize() {
        return { name: this.name };
    }
    static hydrate(scope, originNode, data) {
        return new OpaqueT(scope, originNode, String(data.name));
    }
    humanize() {
        return `opaque ${this.name}`;
    }
    compatibleWith(otherType) {
        return otherType === this;
    }
}
exports.default = OpaqueT;
OpaqueT.type = 'OpaqueT';
