"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function preserveCasing(a, b) {
    if (a === a.toUpperCase()) {
        // If a is upper case then make b uppercase
        return b.toUpperCase();
    }
    else if (a[0] === a[0].toUpperCase()) {
        // First letter is capitalized
        return b[0].toUpperCase() + b.slice(1);
    }
    else {
        return b;
    }
}
exports.preserveCasing = preserveCasing;
