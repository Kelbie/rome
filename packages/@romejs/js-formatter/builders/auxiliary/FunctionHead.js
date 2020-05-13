"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const tokens_1 = require("../../tokens");
function FunctionHead(builder, node) {
    const tokens = [];
    if (builder.options.typeAnnotations && node.typeParameters) {
        tokens.push(builder.tokenize(node.typeParameters, node));
    }
    const printedParameters = utils_1.printBindingPatternParams(builder, node, node.params, node.rest);
    let printedReturnType = '';
    if (builder.options.typeAnnotations) {
        if (node.returnType || node.predicate) {
            const tokens = [':'];
            if (node.returnType) {
                tokens.push(tokens_1.space, builder.tokenize(node.returnType, node));
            }
            if (node.predicate) {
                tokens.push(tokens_1.space, builder.tokenize(node.predicate, node));
            }
            printedReturnType = tokens_1.concat(tokens);
        }
    }
    tokens.push(tokens_1.group(tokens_1.concat([printedParameters, printedReturnType])));
    return tokens_1.concat(tokens);
}
exports.default = FunctionHead;
