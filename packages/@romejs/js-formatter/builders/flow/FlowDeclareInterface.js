"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const FlowInterfaceDeclaration_1 = require("./FlowInterfaceDeclaration");
function FlowDeclareInterface(builder, node) {
    return tokens_1.concat(['declare', tokens_1.space, FlowInterfaceDeclaration_1.default(builder, node)]);
}
exports.default = FlowDeclareInterface;
