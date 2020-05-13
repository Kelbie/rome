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
function ForOfStatement(builder, node) {
    return tokens_1.group(tokens_1.concat([
        'for',
        node.await ? tokens_1.concat([tokens_1.space, 'await']) : '',
        tokens_1.space,
        '(',
        builder.tokenize(node.left, node),
        tokens_1.space,
        'of',
        tokens_1.space,
        builder.tokenize(node.right, node),
        ')',
        utils_1.printClause(builder, node.body, node),
    ]));
}
exports.default = ForOfStatement;
