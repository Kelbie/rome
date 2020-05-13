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
function TSTypeParameterDeclaration(builder, node) {
    const params = node.params;
    const shouldInline = params.length === 1 &&
        params[0].type !== 'IntersectionTypeAnnotation' &&
        params[0].type !== 'UnionTypeAnnotation' &&
        params[0].type !== 'TSIndexedAccessType' &&
        params[0].type !== 'TSMappedType';
    if (shouldInline) {
        return tokens_1.concat(['<', builder.tokenize(params[0], node), '>']);
    }
    else {
        return tokens_1.group(tokens_1.concat([
            '<',
            tokens_1.indent(tokens_1.concat([tokens_1.softline, utils_1.printCommaList(builder, params, node)])),
            tokens_1.softline,
            '>',
        ]));
    }
}
exports.default = TSTypeParameterDeclaration;
