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
class MissingUnionE extends E_1.default {
    constructor(scope, originNode, target, union, missing) {
        super(scope, originNode);
        this.target = target;
        this.union = union;
        this.missing = missing;
    }
    getError() {
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.MISSING_CONDITION(this.missing.map((type) => this.utils.humanize(type))),
            lowerTarget: this.target,
        };
    }
}
exports.default = MissingUnionE;
MissingUnionE.type = 'MissingUnionE';
