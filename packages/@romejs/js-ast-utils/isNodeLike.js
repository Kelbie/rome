"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_helpers_1 = require("@romejs/typescript-helpers");
function isNodeLike(node) {
    if (node == null) {
        return false;
    }
    else {
        return typescript_helpers_1.isPlainObject(node) && typeof node.type === 'string';
    }
}
exports.default = isNodeLike;
