"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_utils_1 = require("@romejs/string-utils");
function NumericLiteral(builder, node) {
    if (builder.options.format === 'pretty') {
        if (node.format === undefined) {
            return string_utils_1.humanizeNumber(node.value);
        }
        else {
            switch (node.format) {
                case 'binary':
                    return `0b${node.value.toString(2)}`;
                case 'octal':
                    return `0o${node.value.toString(8)}`;
                case 'hex':
                    return `0x${node.value.toString(16)}`;
            }
        }
    }
    else {
        return String(node.value);
    }
}
exports.default = NumericLiteral;
