"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowFunctionTypeParam(builder, node) {
    if (node.name) {
        const tokens = [builder.tokenize(node.name, node)];
        if (node.meta.optional === true) {
            tokens.push('?');
        }
        if (node.meta.typeAnnotation) {
            tokens.push(':', tokens_1.space, builder.tokenize(node.meta.typeAnnotation, node));
        }
        return tokens_1.concat(tokens);
    }
    else {
        return builder.tokenize(node.meta.typeAnnotation, node);
    }
}
exports.default = FlowFunctionTypeParam;
