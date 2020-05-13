"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class VoidT extends T_1.default {
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new VoidT(scope, originNode);
    }
    humanize() {
        return 'void';
    }
}
exports.default = VoidT;
VoidT.type = 'VoidT';
