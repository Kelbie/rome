"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function VariableDeclaration(builder, node) {
    const declarations = node.declarations.map((declaration) => builder.tokenize(declaration, node));
    return tokens_1.group(tokens_1.concat([
        node.kind,
        tokens_1.space,
        declarations.shift(),
        tokens_1.indent(tokens_1.concat(declarations.map((declaration) => tokens_1.concat([',', tokens_1.lineOrSpace, declaration])))),
    ]));
}
exports.default = VariableDeclaration;
