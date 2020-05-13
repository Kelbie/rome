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
function TSDeclareMethod(builder, node) {
    return tokens_1.concat([
        builder.tokenize(node.meta, node),
        builder.tokenize(node.key, node),
        utils_1.printMethod(builder, node),
    ]);
}
exports.default = TSDeclareMethod;
