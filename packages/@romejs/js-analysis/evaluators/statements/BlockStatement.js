"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const BlockT_1 = require("../../types/BlockT");
function shouldHoistExecute(node) {
    if (node === undefined) {
        return false;
    }
    if (node.type === 'FunctionDeclaration' || js_ast_utils_1.isTypeNode(node)) {
        return true;
    }
    if (node.type === 'ExportLocalDeclaration' ||
        node.type === 'ExportDefaultDeclaration') {
        return shouldHoistExecute(node.declaration);
    }
    return false;
}
function BlockStatement(node, scope) {
    node = node.type === 'Program' ? node : js_ast_1.blockStatement.assert(node);
    // Declare variables
    for (const child of node.body) {
        if (child.type === 'ImportDeclaration') {
            scope.evaluate(child);
        }
        const declarations = js_ast_utils_1.getBindingIdentifiers(child);
        for (const id of declarations) {
            scope.declareBinding(id.name, id);
        }
    }
    const types = [];
    // Execute hoisted nodes
    const body = [];
    for (const child of node.body) {
        if (child.type === 'ImportDeclaration') {
            // already executed
        }
        else if (shouldHoistExecute(child)) {
            types.push(scope.evaluate(child));
        }
        else {
            body.push(child);
        }
    }
    // Execute rest
    for (const child of body) {
        types.push(scope.evaluate(child));
    }
    return new BlockT_1.default(scope, node, types);
}
exports.default = BlockStatement;
