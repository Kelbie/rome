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
function WhileStatement(builder, node) {
    return tokens_1.group(tokens_1.concat([
        'while',
        tokens_1.space,
        '(',
        tokens_1.group(tokens_1.concat([
            tokens_1.indent(tokens_1.concat([tokens_1.softline, builder.tokenize(node.test, node)])),
            tokens_1.softline,
        ])),
        ')',
        utils_1.printClause(builder, node.body, node),
    ]));
}
exports.default = WhileStatement;
