"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function VariableDeclarationStatement(builder, node) {
    if (node.declare === true && !builder.options.typeAnnotations) {
        return '';
    }
    const tokens = [];
    if (node.declare) {
        tokens.push('declare', tokens_1.space);
    }
    return tokens_1.concat([tokens_1.concat(tokens), builder.tokenize(node.declaration, node), ';']);
}
exports.default = VariableDeclarationStatement;
