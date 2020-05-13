"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function JSXElement(builder, node) {
    const tokens = [
        '<',
        builder.tokenize(node.name, node),
        builder.tokenize(node.typeArguments, node),
    ];
    if (node.attributes.length > 0) {
        tokens.push(tokens_1.space, tokens_1.join(tokens_1.lineOrSpace, node.attributes.map((attr) => builder.tokenize(attr, node))));
    }
    if (node.selfClosing === true && node.children.length === 0) {
        return tokens_1.group(tokens_1.concat([tokens_1.concat(tokens), tokens_1.space, '/>']));
    }
    else {
        return tokens_1.concat([
            tokens_1.group(tokens_1.concat([tokens_1.concat(tokens), '>'])),
            tokens_1.indent(tokens_1.concat(node.children.map((child) => builder.tokenize(child, node)))),
            '</',
            builder.tokenize(node.name, node),
            '>',
        ]);
    }
}
exports.default = JSXElement;
