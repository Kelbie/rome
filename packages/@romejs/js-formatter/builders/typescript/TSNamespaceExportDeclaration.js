"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSNamespaceExportDeclaration(builder, node) {
    return tokens_1.concat([
        'export',
        tokens_1.space,
        'as',
        tokens_1.space,
        'namespace',
        tokens_1.space,
        builder.tokenize(node.id, node),
        ';',
    ]);
}
exports.default = TSNamespaceExportDeclaration;
