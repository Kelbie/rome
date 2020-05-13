"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BooleanLiteralT_1 = require("./BooleanLiteralT");
const T_1 = require("./T");
class BooleanT extends T_1.default {
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new BooleanT(scope, originNode);
    }
    humanize() {
        return 'boolean';
    }
    compatibleWith(type) {
        // A boolean literal can flow into a generic boolean
        return type instanceof BooleanT || type instanceof BooleanLiteralT_1.default;
    }
}
exports.default = BooleanT;
BooleanT.type = 'BooleanT';
