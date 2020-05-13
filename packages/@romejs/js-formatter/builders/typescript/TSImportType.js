"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function TSImportType(builder, node) {
    const tokens = [
        'import(',
        builder.tokenize(node.argument, node),
        ')',
    ];
    if (node.qualifier) {
        tokens.push('.', builder.tokenize(node.qualifier, node));
    }
    if (node.typeParameters) {
        tokens.push(builder.tokenize(node.typeParameters, node));
    }
    return tokens_1.concat(tokens);
}
exports.default = TSImportType;
