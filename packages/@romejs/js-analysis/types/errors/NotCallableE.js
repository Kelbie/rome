"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const E_1 = require("./E");
const diagnostics_1 = require("@romejs/diagnostics");
class NotCallableE extends E_1.default {
    constructor(scope, originNode, callee) {
        super(scope, originNode);
        this.callee = callee;
    }
    getError() {
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.NOT_CALLABLE,
            lowerTarget: this.callee,
        };
    }
}
exports.default = NotCallableE;
NotCallableE.type = 'NotCallableE';
