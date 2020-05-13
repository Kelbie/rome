"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ConditionalExpression(builder, node, parent) {
    return printConditionalExpression(builder.tokenize(node.test, node), builder.tokenize(node.consequent, node), builder.tokenize(node.alternate, node), parent, node.consequent, node.alternate);
}
exports.default = ConditionalExpression;
function isConditionalExpression(node) {
    return (node.type === 'ConditionalExpression' || node.type === 'TSConditionalType');
}
function printConditionalExpression(test, consequent, alternate, parentNode, consequentNode, alternateNode) {
    const printed = tokens_1.concat([
        test,
        tokens_1.indent(tokens_1.concat([
            tokens_1.lineOrSpace,
            '?',
            tokens_1.space,
            isConditionalExpression(consequentNode)
                ? consequent
                : tokens_1.indent(consequent),
        ])),
        tokens_1.indent(tokens_1.concat([
            tokens_1.lineOrSpace,
            ':',
            tokens_1.space,
            isConditionalExpression(alternateNode) ? alternate : tokens_1.indent(alternate),
        ])),
    ]);
    // Do not group nested conditional expressions. By doing so, if a conditional
    // expression breaks, the hole chain breaks.
    return isConditionalExpression(parentNode) ? printed : tokens_1.group(printed);
}
exports.printConditionalExpression = printConditionalExpression;
