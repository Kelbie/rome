"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const VoidT_1 = require("./VoidT");
const T_1 = require("./T");
class EmptyT extends T_1.default {
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new EmptyT(scope, originNode);
    }
    humanize() {
        return 'empty';
    }
    compatibleWith(otherType) {
        return otherType instanceof EmptyT || otherType instanceof VoidT_1.default;
    }
}
exports.default = EmptyT;
EmptyT.type = 'EmptyT';
