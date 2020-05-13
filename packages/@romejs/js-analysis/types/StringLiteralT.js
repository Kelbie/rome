"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ObjT_1 = require("./ObjT");
class StringLiteralT extends ObjT_1.default {
    constructor(scope, originNode, value) {
        super(scope, originNode, {
            props: [],
            proto: scope.intrinsics.StringPrototype,
            calls: [],
        });
        this.value = value;
    }
    serialize() {
        return { value: this.value };
    }
    static hydrate(scope, originNode, data) {
        return new StringLiteralT(scope, originNode, String(data.value));
    }
    humanize() {
        let str = JSON.stringify(this.value);
        if (this.value.includes("'")) {
            return str;
        }
        else {
            return `'${str.slice(1, -1)}'`;
        }
    }
    compatibleWith(type) {
        return type instanceof StringLiteralT && type.value === this.value;
    }
}
exports.default = StringLiteralT;
StringLiteralT.type = 'StringLiteralT';
