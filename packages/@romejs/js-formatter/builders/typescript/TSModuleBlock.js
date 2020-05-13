"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSModuleBlock(builder, node) {
    return tokens_1.concat([
        '{',
        tokens_1.indent(tokens_1.concat([tokens_1.hardline, builder.tokenizeStatementList(node.body, node)])),
        tokens_1.hardline,
        '}',
    ]);
}
exports.default = TSModuleBlock;
