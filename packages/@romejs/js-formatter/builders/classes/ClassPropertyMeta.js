"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ClassPropertyMeta(builder, node) {
    const tokens = [];
    if (!builder.options.typeAnnotations) {
        if (node.accessibility) {
            tokens.push(node.accessibility);
        }
        if (node.readonly) {
            tokens.push('readonly', tokens_1.space);
        }
        if (node.abstract) {
            tokens.push('abstract', tokens_1.space);
        }
    }
    if (node.static) {
        tokens.push('static', tokens_1.space);
    }
    return tokens_1.concat(tokens);
}
exports.default = ClassPropertyMeta;
