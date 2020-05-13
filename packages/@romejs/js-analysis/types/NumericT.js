"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const NumericLiteralT_1 = require("./NumericLiteralT");
const ObjT_1 = require("./ObjT");
class NumericT extends ObjT_1.default {
    constructor(scope, originNode) {
        super(scope, originNode, {
            props: [],
            proto: scope.intrinsics.NumberPrototype,
            calls: [],
        });
    }
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new NumericT(scope, originNode);
    }
    humanize() {
        return 'number';
    }
    compatibleWith(type) {
        // a numeric literal can flow into a generic number
        return type instanceof NumericT || type instanceof NumericLiteralT_1.default;
    }
}
exports.default = NumericT;
NumericT.type = 'NumericT';
