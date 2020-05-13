"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOptions = __ROME__TEST_OPTIONS__ === undefined ? {} : __ROME__TEST_OPTIONS__;
function registerTest(callsiteError, opts, callback) {
    const register = exports.testOptions.register;
    if (typeof register !== 'function') {
        throw new Error('Test harness does not exist');
    }
    register(callsiteError, opts, callback);
}
function isOptionsObject(arg) {
    return typeof arg === 'object' && arg != null && !Array.isArray(arg);
}
function splitArgs(args) {
    const name = args.shift();
    if (typeof name !== 'string' && !Array.isArray(name)) {
        throw new Error('Expected test name to be a string or an array of strings');
    }
    const callback = args.pop();
    if (typeof callback !== 'function') {
        throw new Error('Expected options callback');
    }
    const options = args.pop();
    if (options !== undefined && !isOptionsObject(options)) {
        throw new Error('Expected options object');
    }
    if (args.length > 0) {
        throw new Error('Expected to have exhausted test register arguments');
    }
    return {
        options: {
            ...options,
            name,
        },
        callback,
    };
}
exports.test = function (...args) {
    const { options, callback } = splitArgs(args);
    registerTest(new Error(), options, callback);
};
exports.test.only = function (...args) {
    const { options, callback } = splitArgs(args);
    registerTest(new Error(), {
        ...options,
        only: true,
    }, callback);
};
