"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function FlowDeclareVariable(builder, node, parent) {
    const tokens = [];
    if (parent.type !== 'ExportLocalDeclaration') {
        tokens.push('declare');
        tokens.push(tokens_1.space);
    }
    tokens.push('var');
    tokens.push(tokens_1.space);
    const { id } = node;
    tokens.push(builder.tokenize(id, node));
    if (id.meta !== undefined) {
        tokens.push(builder.tokenize(id.meta.typeAnnotation, node));
    }
    tokens.push(';');
    return tokens_1.concat(tokens);
}
exports.default = FlowDeclareVariable;
