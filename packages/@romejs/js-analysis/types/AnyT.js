"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class AnyT extends T_1.default {
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new AnyT(scope, originNode);
    }
    compatibleWith() {
        return true;
    }
    humanize() {
        return 'any';
    }
}
exports.default = AnyT;
AnyT.type = 'AnyT';
