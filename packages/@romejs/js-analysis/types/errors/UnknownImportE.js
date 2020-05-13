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
class UnknownImportE extends E_1.default {
    constructor(scope, originNode, opts) {
        super(scope, originNode);
        this.possibleNames = opts.possibleNames;
        this.importedName = opts.importedName;
        this.source = opts.source;
    }
    getError() {
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.UNKNOWN_IMPORT(this.importedName, this.source, this.possibleNames),
            lowerTarget: this,
        };
    }
}
exports.default = UnknownImportE;
UnknownImportE.type = 'UnknownImportE';
