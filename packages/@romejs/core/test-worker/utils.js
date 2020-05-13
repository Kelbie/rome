"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pretty_format_1 = require("@romejs/pretty-format");
function format(value) {
    if (typeof value === 'string') {
        return value;
    }
    else {
        return pretty_format_1.default(value);
    }
}
exports.format = format;
