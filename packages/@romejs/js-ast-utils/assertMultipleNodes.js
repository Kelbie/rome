"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function assertMultipleNodes(result) {
    if (Array.isArray(result)) {
        return result;
    }
    else if (result === undefined) {
        return [];
    }
    else if (typeof result === 'symbol') {
        throw new Error('No symbols expected here');
    }
    else {
        return [result];
    }
}
exports.default = assertMultipleNodes;
