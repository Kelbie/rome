"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const comments_1 = require("../comments");
function ArrayExpression(builder, node) {
    const hasContents = node.elements.length > 0;
    const hasRest = (node.type === 'BindingArrayPattern' ||
        node.type === 'AssignmentArrayPattern') &&
        node.rest !== undefined;
    if (!hasContents && !hasRest) {
        if (comments_1.hasInnerComments(node)) {
            return tokens_1.group(tokens_1.concat(['[', builder.tokenizeInnerComments(node, true), tokens_1.softline, ']']));
        }
        else {
            return '[]';
        }
    }
    const tokens = [];
    if (hasContents) {
        const elements = [];
        for (let i = 0; i < node.elements.length; i++) {
            const element = node.elements[i];
            const printed = builder.tokenize(element, node);
            if (i > 0 && builder.getLinesBetween(node.elements[i - 1], element) > 1) {
                elements.push(tokens_1.concat([tokens_1.softline, printed]));
            }
            else {
                elements.push(printed);
            }
        }
        tokens.push(tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), elements));
        if (hasRest) {
            tokens.push(',', tokens_1.lineOrSpace);
        }
        else {
            // Add trailing comma
            tokens.push(tokens_1.ifBreak(','));
        }
    }
    if (hasRest) {
        tokens.push('...', builder.tokenize(node.rest, node));
    }
    return tokens_1.group(tokens_1.concat(['[', tokens_1.indent(tokens_1.concat([tokens_1.softline, tokens_1.concat(tokens)])), tokens_1.softline, ']']));
}
exports.default = ArrayExpression;
