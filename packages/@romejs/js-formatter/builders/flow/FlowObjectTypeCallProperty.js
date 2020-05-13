"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowObjectTypeCallProperty(builder, node) {
    if (node.static === true) {
        return tokens_1.concat(['static', tokens_1.space, builder.tokenize(node.value, node)]);
    }
    else {
        return builder.tokenize(node.value, node);
    }
}
exports.default = FlowObjectTypeCallProperty;
