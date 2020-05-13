"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const utils_1 = require("../utils");
function TSEnumDeclaration(builder, node) {
    const tokens = [];
    if (node.declare) {
        tokens.push('declare', tokens_1.space);
    }
    if (node.const) {
        tokens.push('const', tokens_1.space);
    }
    tokens.push('enum', tokens_1.space, builder.tokenize(node.id, node), tokens_1.space, utils_1.printTSBraced(builder, node, node.members));
    return tokens_1.concat(tokens);
}
exports.default = TSEnumDeclaration;
