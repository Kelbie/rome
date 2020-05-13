"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TypeAliasTypeAnnotation(builder, node) {
    return tokens_1.concat([
        'type',
        tokens_1.space,
        builder.tokenize(node.id, node),
        builder.tokenize(node.typeParameters, node),
        tokens_1.space,
        '=',
        tokens_1.space,
        builder.tokenize(node.right, node),
        ';',
    ]);
}
exports.default = TypeAliasTypeAnnotation;
