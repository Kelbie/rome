"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_helpers_1 = require("@romejs/typescript-helpers");
const ob1_1 = require("@romejs/ob1");
exports.ERROR_FRAMES_PROP = Symbol();
function getErrorStructure(err, framesToShift = 0) {
    let name = 'Error';
    let message = 'Unknown message';
    let stack = undefined;
    let frames = [];
    let looksLikeValidError = false;
    if (typescript_helpers_1.isPlainObject(err)) {
        if (typeof err.name === 'string') {
            looksLikeValidError = true;
            name = err.name;
        }
        if (typeof err.message === 'string') {
            looksLikeValidError = true;
            message = err.message;
        }
        if (typeof err.stack === 'string') {
            looksLikeValidError = true;
            stack = err.stack;
        }
        if (Array.isArray(err[exports.ERROR_FRAMES_PROP])) {
            // @ts-ignore
            frames = err[exports.ERROR_FRAMES_PROP];
        }
    }
    frames = frames.slice(framesToShift);
    if (!looksLikeValidError) {
        message = `Not an error instance: ${String(err)}`;
    }
    return {
        name,
        message,
        stack,
        frames,
    };
}
exports.getErrorStructure = getErrorStructure;
function getSourceLocationFromErrorFrame(frame) {
    const pos = {
        index: ob1_1.ob1Number0Neg1,
        line: frame.lineNumber === undefined ? ob1_1.ob1Number1 : frame.lineNumber,
        column: frame.columnNumber === undefined ? ob1_1.ob1Number0 : frame.columnNumber,
    };
    return {
        filename: frame.filename === undefined ? 'unknown' : frame.filename,
        start: pos,
        end: pos,
    };
}
exports.getSourceLocationFromErrorFrame = getSourceLocationFromErrorFrame;
