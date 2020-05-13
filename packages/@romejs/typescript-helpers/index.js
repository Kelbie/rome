"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isPlainObject(obj) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
exports.isPlainObject = isPlainObject;
function isIterable(obj) {
    if (typeof obj === 'object' && obj != null) {
        // @ts-ignore
        return typeof obj[Symbol.iterator] === 'function';
    }
    else {
        return false;
    }
}
exports.isIterable = isIterable;
