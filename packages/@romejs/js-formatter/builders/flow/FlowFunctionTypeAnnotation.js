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
function FlowFunctionTypeAnnotation(builder, node, parent) {
    const tokens = [
        builder.tokenize(node.typeParameters, node),
        '(',
        utils_1.printCommaList(builder, node.params, node),
        ')',
    ];
    // this node type is overloaded, not sure why but it makes it EXTREMELY annoying
    if (parent.type === 'FlowObjectTypeCallProperty' ||
        parent.type === 'FlowDeclareFunction') {
        tokens.push(':');
    }
    else {
        tokens.push(tokens_1.space);
        tokens.push('=>');
    }
    return tokens_1.concat([tokens_1.concat(tokens), tokens_1.space, builder.tokenize(node.returnType, node)]);
}
exports.default = FlowFunctionTypeAnnotation;
