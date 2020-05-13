"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function RegExpCharSet(builder, node) {
    const tokens = ['['];
    if (node.invert) {
        tokens.push('^');
    }
    return tokens_1.concat([
        tokens_1.concat(tokens),
        tokens_1.concat(node.body.map((item) => builder.tokenize(item, node))),
        ']',
    ]);
}
exports.default = RegExpCharSet;
