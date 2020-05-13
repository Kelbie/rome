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
function ClassHead(builder, node) {
    const tokens = [];
    const tokenGroups = [];
    tokens.push(builder.tokenize(node.typeParameters, node));
    if (node.superClass) {
        tokenGroups.push(tokens_1.group(tokens_1.concat([
            tokens_1.lineOrSpace,
            'extends',
            tokens_1.space,
            builder.tokenize(node.superClass, node),
            builder.tokenize(node.superTypeParameters, node),
        ])));
    }
    if (builder.options.typeAnnotations &&
        node.implements &&
        node.implements.length > 0) {
        tokenGroups.push(tokens_1.lineOrSpace, 'implements', tokens_1.group(tokens_1.indent(tokens_1.concat([tokens_1.lineOrSpace, utils_1.printCommaList(builder, node.implements, node)]))));
    }
    if (tokenGroups.length > 0) {
        tokens.push(tokens_1.group(tokens_1.indent(tokens_1.concat(tokenGroups))));
    }
    return tokens_1.concat(tokens);
}
exports.default = ClassHead;
