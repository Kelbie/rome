"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function isQuantifiedMinZero(el) {
    return el.type === 'RegExpQuantified' && el.min === 0;
}
function lintEmptyMatches(expr) {
    if (expr.type === 'RegExpSubExpression') {
        for (const item of expr.body) {
            let matches = false;
            if (item.type === 'RegExpGroupNonCapture' ||
                item.type === 'RegExpGroupCapture') {
                matches = lintEmptyMatches(item.expression);
            }
            else {
                matches = isQuantifiedMinZero(item);
            }
            if (!matches) {
                return false;
            }
        }
        return true;
    }
    else {
        return lintEmptyMatches(expr.left) || lintEmptyMatches(expr.right);
    }
}
exports.default = {
    name: 'emptyMatches',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'RegExpLiteral' && lintEmptyMatches(node.expression)) {
            context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.EMPTY_MATCHES);
        }
        return node;
    },
};
