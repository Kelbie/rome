"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const StringLiteralT_1 = require("./StringLiteralT");
const ObjT_1 = require("./ObjT");
class StringT extends ObjT_1.default {
    constructor(scope, originNode) {
        super(scope, originNode, {
            props: [],
            proto: scope.intrinsics.StringPrototype,
            calls: [],
        });
    }
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new StringT(scope, originNode);
    }
    humanize() {
        return 'string';
    }
    compatibleWith(type) {
        // a string literal can flow into a generic string
        return type instanceof StringT || type instanceof StringLiteralT_1.default;
    }
}
exports.default = StringT;
StringT.type = 'StringT';
