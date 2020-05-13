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
function ClassMethod(builder, node) {
    const printed = utils_1.printMethod(builder, node);
    if (node.meta.static === true) {
        return tokens_1.concat(['static', tokens_1.space, printed]);
    }
    else {
        return printed;
    }
}
exports.default = ClassMethod;
