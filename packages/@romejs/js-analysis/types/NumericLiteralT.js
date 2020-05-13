"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const NumericT_1 = require("./NumericT");
const ObjT_1 = require("./ObjT");
class NumericLiteralT extends ObjT_1.default {
    constructor(scope, originNode, value) {
        super(scope, originNode, {
            props: [],
            proto: scope.intrinsics.NumberPrototype,
            calls: [],
        });
        this.value = value;
    }
    serialize() {
        return { value: this.value };
    }
    static hydrate(scope, originNode, data) {
        return new NumericLiteralT(scope, originNode, Number(data.value));
    }
    humanize() {
        return String(this.value);
    }
    compatibleWith(type) {
        return (type instanceof NumericT_1.default ||
            (type instanceof NumericLiteralT && type.value === this.value));
    }
}
exports.default = NumericLiteralT;
NumericLiteralT.type = 'NumericLiteralT';
