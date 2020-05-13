"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowOpaqueType(builder, node) {
    const tokens = [
        'opaque',
        tokens_1.space,
        'type',
        tokens_1.space,
        builder.tokenize(node.id, node),
        builder.tokenize(node.typeParameters, node),
    ];
    if (node.supertype) {
        tokens.push(':', tokens_1.space, builder.tokenize(node.supertype, node));
    }
    if (node.impltype) {
        tokens.push(tokens_1.space, '=', tokens_1.space, builder.tokenize(node.impltype, node));
    }
    tokens.push(';');
    return tokens_1.concat(tokens);
}
exports.default = FlowOpaqueType;
