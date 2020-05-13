"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const utils_1 = require("../utils");
function VariableDeclarator(builder, node) {
    if (node.init) {
        return utils_1.printAssignment(builder, node, node.id, tokens_1.concat([tokens_1.space, '=']), node.init);
    }
    else {
        return builder.tokenize(node.id, node);
    }
}
exports.default = VariableDeclarator;
