"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function SwitchCase(builder, node) {
    const tokens = [];
    if (node.test) {
        tokens.push('case', tokens_1.space, builder.tokenize(node.test, node), ':');
    }
    else {
        tokens.push('default', ':');
    }
    const { consequent } = node;
    if (consequent.length === 1 && consequent[0].type === 'BlockStatement') {
        tokens.push(tokens_1.space);
        tokens.push(builder.tokenize(consequent[0], node));
    }
    else if (consequent.length > 0) {
        tokens.push(tokens_1.indent(tokens_1.concat([tokens_1.hardline, builder.tokenizeStatementList(consequent, node)])));
    }
    return tokens_1.concat(tokens);
}
exports.default = SwitchCase;
