"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TemplateLiteral(builder, node) {
    const tokens = [];
    const quasis = node.quasis;
    for (let i = 0; i < quasis.length; i++) {
        tokens.push(builder.tokenize(quasis[i], node));
        if (i + 1 < quasis.length) {
            tokens.push(builder.tokenize(node.expressions[i], node));
        }
    }
    return tokens_1.concat(tokens);
}
exports.default = TemplateLiteral;
