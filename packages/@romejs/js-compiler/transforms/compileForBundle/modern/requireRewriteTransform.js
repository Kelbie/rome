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
    name: 'requireRewriteTransform',
    enter(path) {
        const { node, context } = path;
        const { relativeSourcesToModuleId, moduleId } = _utils_1.getOptions(context);
        // Replace all references to module.exports to the correct version
        if (node.type === 'MemberExpression' &&
            js_ast_utils_1.doesNodeMatchPattern(node, 'module.exports')) {
            return js_ast_1.identifier.create({
                name: _utils_1.getPrefixedNamespace(moduleId),
                loc: js_ast_utils_1.inheritLoc(node, 'module.exports'),
            });
        }
        // Replace all assignments of module.exports to the correct version
        if (node.type === 'AssignmentExpression' &&
            js_ast_utils_1.doesNodeMatchPattern(node.left, 'module.exports')) {
            return js_ast_1.assignmentExpression.create({
                operator: node.operator,
                left: js_ast_1.assignmentIdentifier.create({
                    name: _utils_1.getPrefixedNamespace(moduleId),
                    loc: js_ast_utils_1.inheritLoc(node, 'module.exports'),
                }),
                right: node.right,
            });
        }
        // Replace import foo = require('module');
        if (node.type === 'TSImportEqualsDeclaration' &&
            node.moduleReference.type === 'TSExternalModuleReference') {
            return js_ast_utils_1.template.statement `const ${node.id} = require(${node.moduleReference.expression});`;
        }
        // Now handle normal `require('module')`
        if (node.type !== 'CallExpression') {
            return node;
        }
        const { callee } = node;
        if (callee.type !== 'ReferenceIdentifier' || callee.name !== 'require') {
            return node;
        }
        const sourceArg = node.arguments[0];
        if (sourceArg.type !== 'StringLiteral') {
            return node;
        }
        if (path.scope.hasBinding('require')) {
            return node;
        }
        const replacement = relativeSourcesToModuleId[sourceArg.value];
        if (typeof replacement === 'string') {
            return js_ast_1.identifier.create({
                name: _utils_1.getPrefixedNamespace(replacement),
            });
        }
        return node;
    },
};
