"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_USER_OPTIONS = {
    // I want to kill this option very badly
    allowReturnOutsideFunction: false,
    // Source type ("template", "script" or "module") for different semantics
    sourceType: 'script',
    // Whether we should be tracking tokens when parsing this file
    // NOTE: This is memory-intensive
    tokens: false,
    syntax: [],
    manifestPath: 'package.json',
};
// Interpret and default an options object
function normalizeOptions(opts) {
    return {
        ...DEFAULT_USER_OPTIONS,
        ...opts,
    };
}
exports.normalizeOptions = normalizeOptions;
