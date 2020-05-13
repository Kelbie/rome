"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class BooleanLiteralT extends T_1.default {
    constructor(scope, originNode, value) {
        super(scope, originNode);
        this.value = value;
    }
    serialize() {
        return { value: this.value };
    }
    static hydrate(scope, originNode, data) {
        return new BooleanLiteralT(scope, originNode, Boolean(data.value));
    }
    humanize() {
        if (this.value === true) {
            return 'true';
        }
        else {
            return 'false';
        }
    }
    compatibleWith(type) {
        return type instanceof BooleanLiteralT && type.value === this.value;
    }
}
exports.default = BooleanLiteralT;
BooleanLiteralT.type = 'BooleanLiteralT';
