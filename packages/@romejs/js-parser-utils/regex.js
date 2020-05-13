"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const VALID_REGEX_FLAGS = 'gmsiyu'.split('');
// This is used by both rome-json and rome-js-parser to validate regex flags
function validateRegexFlags(flags, onUnexpected) {
    const foundFlags = new Set();
    for (let i = 0; i < flags.length; i++) {
        const flag = flags[i];
        if (VALID_REGEX_FLAGS.includes(flag)) {
            if (foundFlags.has(flag)) {
                onUnexpected(diagnostics_1.descriptions.REGEX_PARSER.DUPLICATE_FLAG, i);
            }
            else {
                foundFlags.add(flag);
            }
        }
        else {
            onUnexpected(diagnostics_1.descriptions.REGEX_PARSER.INVALID_FLAG, i);
        }
    }
    return foundFlags;
}
exports.validateRegexFlags = validateRegexFlags;
