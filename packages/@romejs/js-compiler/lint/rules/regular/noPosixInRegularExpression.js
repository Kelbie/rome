"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function checkRegEx(node, context) {
    node.body.forEach((currNode, i) => {
        const nextNode = node.body[i + 1];
        const lastNode = node.body[node.body.length - 1];
        if (currNode.type === 'RegExpCharacter' &&
            currNode.value === '[' &&
            nextNode &&
            nextNode.type === 'RegExpCharacter' &&
            (nextNode.value === ':' || nextNode.value === '.') &&
            lastNode.type === 'RegExpCharacter' &&
            lastNode.value === nextNode.value) {
            context.addNodeDiagnostic(currNode, diagnostics_1.descriptions.LINT.NO_POSIX_IN_REGULAR_EXPRESSION, { fixable: false });
        }
    });
    return node;
}
exports.default = {
    name: 'noPosixInRegularExpression',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'RegExpCharSet' && node.body.length > 2) {
            return checkRegEx(node, context);
        }
        return node;
    },
};
