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
function TSInterfaceDeclaration(builder, node) {
    const tokens = [];
    if (node.declare) {
        tokens.push('declare', tokens_1.space);
    }
    tokens.push('interface', tokens_1.space, builder.tokenize(node.id, node), builder.tokenize(node.typeParameters, node));
    if (node.extends) {
        tokens.push(tokens_1.space, 'extends', tokens_1.space, utils_1.printCommaList(builder, node.extends, node));
    }
    return tokens_1.concat([tokens_1.concat(tokens), tokens_1.space, builder.tokenize(node.body, node)]);
}
exports.default = TSInterfaceDeclaration;
