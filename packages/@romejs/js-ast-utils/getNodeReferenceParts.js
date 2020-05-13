"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const isIdentifierish_1 = require("./isIdentifierish");
const cache = new WeakMap();
const EMPTY = {
    bailed: true,
    parts: [],
};
function getNodeReferenceParts(node) {
    if (node === undefined) {
        return EMPTY;
    }
    const cached = cache.get(node);
    if (cached !== undefined) {
        return cached;
    }
    const parts = [];
    function add(node) {
        if (isIdentifierish_1.default(node)) {
            parts.push({ node, value: node.name });
            return false;
        }
        else if (node.type === 'ThisExpression') {
            parts.push({ node, value: 'this' });
            return false;
        }
        else if (node.type === 'StringLiteral') {
            parts.push({ node, value: node.value });
            return false;
        }
        else if (node.type === 'MetaProperty') {
            parts.push({ node, value: node.meta.name });
            parts.push({ node, value: node.property.name });
            return false;
        }
        else if (node.type === 'MemberExpression') {
            const stop = add(node.object);
            if (stop) {
                return true;
            }
            else {
                return add(node.property);
            }
        }
        else if (node.type === 'ComputedMemberProperty' &&
            node.value.type === 'StringLiteral') {
            return add(node.value);
        }
        else if (node.type === 'StaticMemberProperty') {
            return add(node.value);
        }
        else {
            return true;
        }
    }
    const bailed = add(node);
    const result = { bailed, parts };
    cache.set(node, result);
    return result;
}
exports.default = getNodeReferenceParts;
