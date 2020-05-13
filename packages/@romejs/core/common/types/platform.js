"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORMS = [
    'ios',
    'android',
    'mobile',
    'electron',
    'web',
    'node',
];
exports.PLATFORM_ALIASES = {
    ios: ['mobile'],
    android: ['mobile'],
    electron: ['web'],
    mobile: [],
    node: [],
    web: [],
};
