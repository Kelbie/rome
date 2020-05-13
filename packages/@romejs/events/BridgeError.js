"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
class BridgeError extends Error {
    constructor(message, bridge) {
        super(message);
        this.bridge = bridge;
    }
}
exports.default = BridgeError;
