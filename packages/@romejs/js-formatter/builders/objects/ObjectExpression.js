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
function ObjectExpression(builder, node) {
    if (comments_1.hasInnerComments(node)) {
        return tokens_1.group(tokens_1.concat(['{', builder.tokenizeInnerComments(node, true), tokens_1.softline, '}']));
    }
    const tokens = [];
    const props = node.properties;
    tokens.push(tokens_1.join(tokens_1.concat([',', tokens_1.lineOrSpace]), props.map((prop, index) => {
        const printed = builder.tokenize(prop, node);
        if (index > 0 && builder.getLinesBetween(props[index - 1], prop) > 1) {
            return tokens_1.concat([tokens_1.softline, printed]);
        }
        else {
            return printed;
        }
    })));
    if ((node.type === 'BindingObjectPattern' ||
        node.type === 'AssignmentObjectPattern') &&
        node.rest !== undefined) {
        if (props.length > 0) {
            tokens.push(',', tokens_1.lineOrSpace);
            if (builder.getLinesBetween(props[props.length - 1], node.rest) > 1) {
                tokens.push(tokens_1.softline);
            }
        }
        tokens.push('...', builder.tokenize(node.rest, node));
    }
    else if (props.length > 0) {
        // Add trailing comma
        tokens.push(tokens_1.ifBreak(','));
    }
    // If the first property is not one the same line as the opening brace,
    // the object is printed on multiple lines.
    const shouldBreak = node.loc !== undefined &&
        props.length > 0 &&
        props[0].loc !== undefined &&
        props[0].loc.start.line !== node.loc.start.line;
    return tokens_1.group(tokens_1.concat(['{', tokens_1.indent(tokens_1.concat([tokens_1.softline, tokens_1.concat(tokens)])), tokens_1.softline, '}']), shouldBreak);
}
exports.default = ObjectExpression;
