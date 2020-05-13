"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function Program(builder, node) {
    const tokens = [
        builder.tokenizeStatementList(node.directives, node),
    ];
    if (node.directives && node.directives.length) {
        tokens.push(tokens_1.hardline);
    }
    tokens.push(builder.tokenizeInnerComments(node, false), builder.tokenizeStatementList(node.body, node));
    tokens.push(tokens_1.hardline);
    return tokens_1.concat(tokens);
}
exports.default = Program;
