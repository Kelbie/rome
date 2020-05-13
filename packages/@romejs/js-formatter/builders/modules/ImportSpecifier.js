"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ImportSpecifier(builder, node) {
    const tokens = [];
    if (node.local.importKind === 'type' || node.local.importKind === 'typeof') {
        tokens.push(node.local.importKind, tokens_1.space);
    }
    tokens.push(builder.tokenize(node.imported, node));
    if (node.local.name.name !== node.imported.name) {
        tokens.push(tokens_1.space, 'as', tokens_1.space, builder.tokenize(node.local.name, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = ImportSpecifier;
