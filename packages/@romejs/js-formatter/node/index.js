"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ob1_1 = require("@romejs/ob1");
const parentheses_1 = require("./parentheses");
function isOrHasCallExpression(node) {
    if (node.type === 'CallExpression') {
        return true;
    }
    if (node.type === 'ComputedMemberProperty') {
        return isOrHasCallExpression(node.value);
    }
    if (node.type === 'MemberExpression') {
        return (isOrHasCallExpression(node.object) || isOrHasCallExpression(node.property));
    }
    return false;
}
function orderLoc(a, b) {
    if (ob1_1.ob1Get0(a.end.index) < ob1_1.ob1Get0(b.start.index)) {
        return [a, b];
    }
    else {
        return [b, a];
    }
}
function getLinesBetween(aNode, bNode) {
    if (aNode.loc && bNode.loc) {
        const [a, b] = orderLoc(aNode.loc, bNode.loc);
        return ob1_1.ob1Get1(b.start.line) - ob1_1.ob1Get1(a.end.line);
    }
    else {
        return 0;
    }
}
exports.getLinesBetween = getLinesBetween;
function needsParens(node, parent, printStack) {
    if (!parent) {
        return false;
    }
    if (parent.type === 'NewExpression' && parent.callee === node) {
        if (isOrHasCallExpression(node)) {
            return true;
        }
    }
    const fn = parentheses_1.default.get(node.type);
    return fn ? fn(node, parent, printStack) : false;
}
exports.needsParens = needsParens;
function isOnSameLine(aNode, bNode) {
    if (aNode.loc && bNode.loc) {
        return aNode.loc.end.line === bNode.loc.start.line;
    }
    else {
        return false;
    }
}
exports.isOnSameLine = isOnSameLine;
