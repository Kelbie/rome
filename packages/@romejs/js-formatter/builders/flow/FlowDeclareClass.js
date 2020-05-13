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
function FlowDeclareClass(builder, node, parent) {
    const tokens = [];
    if (parent.type !== 'ExportLocalDeclaration') {
        tokens.push('declare');
        tokens.push(tokens_1.space);
    }
    return tokens_1.concat([tokens_1.concat(tokens), 'class', tokens_1.space, FlowInterfaceDeclaration_1._interfaceish(builder, node)]);
}
exports.default = FlowDeclareClass;
