"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const Identifier_1 = require("../auxiliary/Identifier");
const utils_1 = require("../utils");
function BindingIdentifier(builder, node) {
    if (node.name[0] === '*') {
        // Internal name
        return '';
    }
    return tokens_1.concat([
        Identifier_1.default(builder, node),
        utils_1.printPatternMeta(builder, node, node.meta),
    ]);
}
exports.default = BindingIdentifier;
