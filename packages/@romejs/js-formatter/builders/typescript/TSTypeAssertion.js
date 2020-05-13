"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSTypeAssertion(builder, node) {
    if (builder.options.typeAnnotations) {
        return tokens_1.group(tokens_1.concat([
            tokens_1.group(tokens_1.concat([
                '<',
                tokens_1.indent(tokens_1.concat([tokens_1.softline, builder.tokenize(node.typeAnnotation, node)])),
                tokens_1.softline,
                '>',
            ])),
            builder.tokenize(node.expression, node),
        ]));
    }
    else {
        return builder.tokenize(node.expression, node);
    }
}
exports.default = TSTypeAssertion;
