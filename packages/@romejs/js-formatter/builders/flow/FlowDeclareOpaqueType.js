"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
const FlowOpaqueType_1 = require("./FlowOpaqueType");
function FlowDeclareOpaqueType(builder, node, parent) {
    if (parent.type === 'ExportLocalDeclaration') {
        return FlowOpaqueType_1.default(builder, node);
    }
    else {
        return tokens_1.concat(['declare', tokens_1.space, FlowOpaqueType_1.default(builder, node)]);
    }
}
exports.default = FlowDeclareOpaqueType;
