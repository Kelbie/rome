"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowDeclareFunction(builder, node, parent) {
    const tokens = [];
    if (parent.type !== 'ExportLocalDeclaration') {
        tokens.push('declare', tokens_1.space);
    }
    return tokens_1.concat([
        tokens_1.concat(tokens),
        'function',
        tokens_1.space,
        builder.tokenize(node.id, node),
        ';',
    ]);
}
exports.default = FlowDeclareFunction;
