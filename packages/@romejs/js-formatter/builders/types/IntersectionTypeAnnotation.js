"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_1 = require("../../tokens");
function IntersectionTypeAnnotation(builder, node) {
    const parts = [];
    let shouldIndent = false;
    let previous;
    for (let i = 0; i < node.types.length; i++) {
        const type = node.types[i];
        const printed = builder.tokenize(type, node);
        if (previous === undefined) {
            parts.push(printed);
        }
        else if (isObjectType(previous) && isObjectType(type)) {
            //   let foo: {
            //     a: string;
            //     b: string;
            //   } & {
            //     c: string;
            //     d: string;
            //   };
            parts.push(tokens_1.space, '&', tokens_1.space, shouldIndent ? tokens_1.indent(printed) : printed);
        }
        else if (!isObjectType(previous) && !isObjectType(type)) {
            //   let foo: XXXX &
            //     YYYY &&
            //     ZZZZ;
            parts.push(tokens_1.indent(tokens_1.concat([tokens_1.space, '&', tokens_1.lineOrSpace, printed])));
        }
        else {
            //   let z: AAA & {
            //     a: string;
            //     b: string;
            //   } & BBB &
            //     CCC & {
            //       c: string;
            //       d: string;
            //     };
            if (i > 1) {
                shouldIndent = true;
            }
            parts.push(tokens_1.space, '&', tokens_1.space, shouldIndent ? tokens_1.indent(printed) : printed);
        }
        previous = type;
    }
    return tokens_1.group(tokens_1.concat(parts));
}
exports.default = IntersectionTypeAnnotation;
function isObjectType(node) {
    return (node.type === 'FlowObjectTypeAnnotation' ||
        node.type === 'TSMappedType' ||
        node.type === 'TSTypeLiteral');
}
