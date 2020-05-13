"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ClassPrivateProperty(builder, node) {
    const tokens = [
        builder.tokenize(node.meta, node),
        builder.tokenize(node.key, node),
    ];
    if (builder.options.typeAnnotations && node.typeAnnotation) {
        tokens.push(':', tokens_1.space, builder.tokenize(node.typeAnnotation, node));
    }
    if (node.value) {
        tokens.push(tokens_1.space);
        tokens.push('=');
        tokens.push(tokens_1.space);
        tokens.push(builder.tokenize(node.value, node));
    }
    tokens.push(';');
    return tokens_1.group(tokens_1.concat(tokens));
}
exports.default = ClassPrivateProperty;
