"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class SideEffectT extends T_1.default {
    constructor(scope, originNode, actualType) {
        super(scope, originNode);
        this.actualType = actualType;
    }
    reduce() {
        return this.utils.reduce(this.actualType);
    }
}
exports.default = SideEffectT;
SideEffectT.type = 'SideEffectT';
