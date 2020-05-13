"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
function normalizeUserVersion(ver, opts) {
    if (typeof ver === 'string') {
        return parse_1.parseSemverVersion({ ...opts, input: ver });
    }
    else if (ver.type === 'AbsoluteVersion') {
        return ver;
    }
    else {
        throw new Error(`Not a valid version: ${ver.type}`);
    }
}
exports.normalizeUserVersion = normalizeUserVersion;
function normalizeUserRange(range, opts) {
    if (typeof range === 'string') {
        return parse_1.parseSemverRange({ ...opts, input: range });
    }
    else {
        return range;
    }
}
exports.normalizeUserRange = normalizeUserRange;
