"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const E_1 = require("./E");
class UndeclaredVarE extends E_1.default {
    constructor(scope, originNode, name) {
        super(scope, originNode);
        this.name = name;
    }
    getError() {
        const possibleNames = this.scope.getBindingNames();
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.UNDECLARED_VARIABLE(this.name, possibleNames),
            lowerTarget: this,
        };
    }
}
exports.default = UndeclaredVarE;
UndeclaredVarE.type = 'UndeclaredVarE';
