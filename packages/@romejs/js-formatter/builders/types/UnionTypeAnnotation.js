"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function UnionTypeAnnotation(builder, node, parent) {
    // Indentation may be handled by the parent node
    const shouldIndent = parent.type !== 'TSTypeAssertion' &&
        parent.type !== 'TSTypeParameterDeclaration' &&
        parent.type !== 'TSTypeParameterInstantiation';
    const printed = tokens_1.concat([
        tokens_1.ifBreak(tokens_1.concat([shouldIndent ? tokens_1.hardline : '', '|', tokens_1.space])),
        tokens_1.join(tokens_1.concat([tokens_1.lineOrSpace, '|', tokens_1.space]), node.types.map((type) => tokens_1.indent(builder.tokenize(type, node)))),
    ]);
    return tokens_1.group(shouldIndent ? tokens_1.indent(printed) : printed);
}
exports.default = UnionTypeAnnotation;
