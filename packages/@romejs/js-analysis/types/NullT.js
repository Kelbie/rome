"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class NullT extends T_1.default {
    serialize() {
        return {};
    }
    static hydrate(scope, originNode) {
        return new NullT(scope, originNode);
    }
    humanize() {
        return 'null';
    }
}
exports.default = NullT;
NullT.type = 'NullT';
