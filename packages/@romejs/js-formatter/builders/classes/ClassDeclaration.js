"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const comments_1 = require("../comments");
function ClassDeclaration(builder, node) {
    const tokens = ['class'];
    if (node.id) {
        tokens.push(tokens_1.space, builder.tokenize(node.id, node));
    }
    tokens.push(builder.tokenize(node.meta, node), tokens_1.space, '{');
    if (comments_1.hasInnerComments(node.meta)) {
        tokens.push(builder.tokenizeInnerComments(node.meta, true), tokens_1.hardline);
    }
    if (node.meta.body.length > 0) {
        tokens.push(tokens_1.concat([
            tokens_1.indent(tokens_1.concat([
                tokens_1.hardline,
                builder.tokenizeStatementList(node.meta.body, node.meta),
            ])),
            tokens_1.hardline,
        ]));
    }
    tokens.push('}');
    return tokens_1.concat(tokens);
}
exports.default = ClassDeclaration;
