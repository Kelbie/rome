"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const isDeclaration_1 = require("./isDeclaration");
function isStatement(node) {
    if (node === undefined) {
        return false;
    }
    if (isDeclaration_1.default(node)) {
        return true;
    }
    switch (node.type) {
        case 'BlockStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
        case 'DebuggerStatement':
        case 'DoWhileStatement':
        case 'EmptyStatement':
        case 'ExpressionStatement':
        case 'ForInStatement':
        case 'ForStatement':
        case 'IfStatement':
        case 'LabeledStatement':
        case 'ReturnStatement':
        case 'SwitchStatement':
        case 'ThrowStatement':
        case 'TryStatement':
        case 'WhileStatement':
        case 'WithStatement':
        case 'ForOfStatement': {
            const statement = node;
            statement;
            return true;
        }
        default: {
            // Assert that all statements were handled
            const notStatement = node;
            notStatement;
            return false;
        }
    }
}
exports.default = isStatement;
