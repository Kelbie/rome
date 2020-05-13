"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ExportAllDeclaration(builder, node) {
    const tokens = ['export', tokens_1.space];
    if (node.exportKind === 'type') {
        if (!builder.options.typeAnnotations) {
            return '';
        }
        tokens.push('type', tokens_1.space);
    }
    tokens.push('*', tokens_1.space, 'from', tokens_1.space, builder.tokenize(node.source, node), ';');
    return tokens_1.concat(tokens);
}
exports.default = ExportAllDeclaration;
