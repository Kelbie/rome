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
const _utils_1 = require("../_utils");
exports.default = {
    name: 'magicCJSTransform',
    enter(path) {
        const { node, scope, context } = path;
        const options = _utils_1.getOptions(context);
        // Update relative requires with their module id
        if (node.type === 'CallExpression' &&
            node.callee.type === 'ReferenceIdentifier' &&
            node.callee.name === 'require' &&
            scope.getBinding('require') === undefined) {
            const args = node.arguments;
            const arg = args[0];
            // Maybe error?
            if (args.length !== 1 || arg.type !== 'StringLiteral') {
                return node;
            }
            const source = arg.value;
            if (Object.prototype.hasOwnProperty.call(options.relativeSourcesToModuleId, source)) {
                const resolved = options.relativeSourcesToModuleId[source];
                const sourceNode = js_ast_1.stringLiteral.create({
                    value: resolved,
                });
                return js_ast_utils_1.template.expression `Rome.requireNamespace(${sourceNode})`;
            }
        }
        if (node.type === 'ReferenceIdentifier' &&
            node.name === 'require' &&
            scope.getBinding('require') === undefined) {
            return js_ast_utils_1.template.expression `Rome.requireNamespace`;
        }
        return node;
    },
    exit(path) {
        const { node, context } = path;
        const options = _utils_1.getOptions(context);
        // Add module wrapper
        if (node.type === 'Program') {
            const source = js_ast_1.stringLiteral.create({
                value: options.moduleId,
            });
            // Build factory
            const factoryBody = js_ast_1.blockStatement.create({
                directives: node.directives,
                body: node.body,
            });
            const factory = {
                ...js_ast_1.functionExpression.assert(js_ast_utils_1.template.expression `(function(module, exports) {})`),
                body: factoryBody,
            };
            // Build call
            const declare = options.analyze.moduleType === 'es'
                ? js_ast_utils_1.template.expression `Rome.declareES`
                : js_ast_utils_1.template.expression `Rome.declareCJS`;
            const wrapper = js_ast_utils_1.template.statement `${declare}(${source}, ${factory})`;
            return {
                ...node,
                directives: [],
                body: [wrapper],
            };
        }
        return node;
    },
};
