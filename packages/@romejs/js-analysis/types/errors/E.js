"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AnyT_1 = require("../AnyT");
const T_1 = require("../T");
class E extends T_1.default {
    static hydrate(scope, originNode) {
        return new AnyT_1.default(scope, originNode);
    }
    humanize() {
        return this.getError().description.message.value;
    }
    getError() {
        throw new Error('unimplemented');
    }
    compatibleWith() {
        return false;
    }
}
exports.default = E;
E.type = 'E';
