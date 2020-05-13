"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function RegExpGroupNonCapture(builder, node) {
    const tokens = ['(?'];
    switch (node.kind) {
        case 'positive-lookahead': {
            tokens.push('=');
            break;
        }
        case 'negative-lookahead': {
            tokens.push('!');
            break;
        }
        case 'positive-lookbehind': {
            tokens.push('<!');
            break;
        }
        case 'negative-lookbehind': {
            tokens.push('<=');
            break;
        }
        default: {
            tokens.push(':');
            break;
        }
    }
    tokens.push(builder.tokenize(node.expression, node));
    tokens.push(')');
    return tokens_1.concat(tokens);
}
exports.default = RegExpGroupNonCapture;
