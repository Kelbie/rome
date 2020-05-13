"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const ExportLocalDeclaration_1 = require("./ExportLocalDeclaration");
function ExportDefaultDeclaration(builder, node) {
    return tokens_1.concat([
        'export',
        tokens_1.space,
        'default',
        tokens_1.space,
        ExportLocalDeclaration_1.printExportDeclaration(builder, node),
    ]);
}
exports.default = ExportDefaultDeclaration;
