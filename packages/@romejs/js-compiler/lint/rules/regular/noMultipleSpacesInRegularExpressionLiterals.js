"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const diagnostics_1 = require("@romejs/diagnostics");
function isSpaceChar(node) {
    return (node !== undefined && node.type === 'RegExpCharacter' && node.value === ' ');
}
function checkRegex(node, context) {
    for (let i = 0; i < node.body.length; i++) {
        const item = node.body[i];
        // Do some quick checks to see if we'll produce an error
        if (!isSpaceChar(item) || !isSpaceChar(node.body[i + 1])) {
            continue;
        }
        const spaceNodes = [];
        // Get all the space nodes
        for (let x = i; x < node.body.length; x++) {
            const item = node.body[i];
            if (isSpaceChar(item)) {
                spaceNodes.push(item);
                x++;
            }
            else {
                break;
            }
        }
        const quantifiedSpace = js_ast_1.regExpQuantified.create({
            min: spaceNodes.length,
            max: spaceNodes.length,
            target: item,
        });
        const newRegex = {
            ...node,
            body: [
                // Get start
                ...node.body.slice(0, i - 1),
                // Inject quantifier
                quantifiedSpace,
                // Get end
                ...node.body.slice(i + spaceNodes.length),
            ],
        };
        return context.addFixableDiagnostic({
            target: spaceNodes,
            old: node,
            fixed: checkRegex(newRegex, context),
        }, diagnostics_1.descriptions.LINT.NO_MULTIPLE_SPACES_IN_REGEX_LITERAL(spaceNodes.length));
    }
    return node;
}
exports.default = {
    name: 'noMultipleSpacesInRegularExpressionLiterals',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'RegExpSubExpression') {
            return checkRegex(node, context);
        }
        return node;
    },
};
