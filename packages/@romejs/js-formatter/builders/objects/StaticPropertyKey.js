"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function StaticPropertyKey(builder, node) {
    return builder.tokenize(node.value, node);
}
exports.default = StaticPropertyKey;
