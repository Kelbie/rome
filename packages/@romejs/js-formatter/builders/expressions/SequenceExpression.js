"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function SequenceExpression(builder, node, parent) {
    if (parent.type === 'ExpressionStatement' ||
        parent.type === 'ForStatement' ||
        parent.type === 'SequenceExpression') {
        // Indent expressions after the first to improve the readability
        return tokens_1.group(tokens_1.concat(node.expressions.map((expr, i) => i === 0
            ? builder.tokenize(expr, node)
            : tokens_1.concat([
                ',',
                tokens_1.indent(tokens_1.concat([tokens_1.lineOrSpace, builder.tokenize(expr, node)])),
            ]))));
    }
    else {
        return tokens_1.group(tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), node.expressions.map((expr) => builder.tokenize(expr, node))));
    }
}
exports.default = SequenceExpression;
