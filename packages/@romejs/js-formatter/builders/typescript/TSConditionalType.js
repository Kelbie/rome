"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const ConditionalExpression_1 = require("../expressions/ConditionalExpression");
function TSConditionalType(builder, node, parent) {
    return ConditionalExpression_1.printConditionalExpression(tokens_1.concat([
        builder.tokenize(node.checkType, node),
        tokens_1.space,
        'extends',
        tokens_1.space,
        builder.tokenize(node.extendsType, node),
    ]), builder.tokenize(node.trueType, node), builder.tokenize(node.falseType, node), parent, node.trueType, node.falseType);
}
exports.default = TSConditionalType;
