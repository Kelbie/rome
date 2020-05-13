"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSModuleDeclaration(builder, node) {
    const tokens = [];
    if (node.declare) {
        tokens.push('declare');
        tokens.push(tokens_1.space);
    }
    if (!node.global) {
        tokens.push(node.id.type === 'BindingIdentifier' ? 'namespace' : 'module');
        tokens.push(tokens_1.space);
    }
    tokens.push(builder.tokenize(node.id, node));
    if (!node.body) {
        tokens.push(';');
        return tokens_1.concat(tokens);
    }
    let body = node.body;
    while (body !== undefined && body.type === 'TSModuleDeclaration') {
        tokens.push('.', builder.tokenize(body.id, body));
        body = body.body;
    }
    return tokens_1.concat([tokens_1.concat(tokens), tokens_1.space, builder.tokenize(body, node)]);
}
exports.default = TSModuleDeclaration;
