"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function ExportLocalSpecifier(builder, node) {
    const tokens = [builder.tokenize(node.local, node)];
    if (node.local.name === node.exported.name) {
        return tokens_1.concat(tokens);
    }
    else {
        return tokens_1.concat([
            tokens_1.concat(tokens),
            tokens_1.space,
            'as',
            tokens_1.space,
            builder.tokenize(node.exported, node),
        ]);
    }
}
exports.default = ExportLocalSpecifier;
