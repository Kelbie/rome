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
function ForStatement(builder, node) {
    const body = utils_1.printClause(builder, node.body, node);
    if (!node.init && !node.test && !node.update) {
        return tokens_1.group(tokens_1.concat(['for', tokens_1.space, '(;;)', body]));
    }
    return tokens_1.group(tokens_1.concat([
        'for',
        tokens_1.space,
        '(',
        tokens_1.group(tokens_1.concat([
            tokens_1.indent(tokens_1.concat([
                tokens_1.softline,
                builder.tokenize(node.init, node),
                ';',
                tokens_1.lineOrSpace,
                builder.tokenize(node.test, node),
                ';',
                tokens_1.lineOrSpace,
                builder.tokenize(node.update, node),
            ])),
            tokens_1.softline,
        ])),
        ')',
        body,
    ]));
}
exports.default = ForStatement;
