"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = {
    name: 'noAsyncPromiseExecutor',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'NewExpression' &&
            node.callee.type === 'ReferenceIdentifier' &&
            node.callee.name === 'Promise' &&
            node.arguments.length > 0 &&
            (node.arguments[0].type === 'ArrowFunctionExpression' ||
                node.arguments[0].type === 'FunctionExpression') &&
            node.arguments[0].head.async) {
            context.addNodeDiagnostic(node.arguments[0], diagnostics_1.descriptions.LINT.NO_ASYNC_PROMISE_EXECUTOR);
        }
        return node;
    },
};
