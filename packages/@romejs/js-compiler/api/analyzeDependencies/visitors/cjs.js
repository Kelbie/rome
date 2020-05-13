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
const records_1 = require("../records");
const utils_1 = require("../utils");
exports.default = {
    name: 'analyzeDependenciesCJS',
    enter(path) {
        const { node, parent, scope, context } = path;
        // Handle require()
        if (node.type === 'CallExpression') {
            const { callee, arguments: args } = node;
            const isRequire = callee.type === 'ReferenceIdentifier' &&
                callee.name === 'require' &&
                path.scope.hasBinding('require') === false;
            const sourceArg = args[0];
            if (isRequire && args.length === 1 && sourceArg.type === 'StringLiteral') {
                context.record(new records_1.ImportRecord({
                    type: 'cjs',
                    kind: 'value',
                    optional: utils_1.isOptional(path),
                    loc: node.loc,
                    source: sourceArg.value,
                    names: [],
                    all: true,
                    async: false,
                }));
            }
        }
        // Detect assignments to exports and module.exports as definitely being an CJS module
        if (node.type === 'AssignmentExpression') {
            const isModuleExports = path.scope.getBinding('module') === undefined &&
                (js_ast_utils_1.doesNodeMatchPattern(node.left, 'module.exports') ||
                    js_ast_utils_1.doesNodeMatchPattern(node.left, 'module.exports.**'));
            const isExports = path.scope.getBinding('exports') === undefined &&
                (js_ast_utils_1.doesNodeMatchPattern(node.left, 'exports') ||
                    js_ast_utils_1.doesNodeMatchPattern(node.left, 'exports.**'));
            if (isModuleExports || isExports) {
                context.record(new records_1.CJSExportRecord(node));
            }
            if (isModuleExports) {
                const { right } = node;
                if (js_ast_1.objectExpression.is(right)) {
                    context.record(new records_1.ExportRecord({
                        type: 'local',
                        loc: utils_1.getDeclarationLoc(scope, node.right),
                        valueType: utils_1.getAnalyzeExportValueType(scope, node.right),
                        kind: 'value',
                        name: 'default',
                    }));
                    for (const prop of right.properties) {
                        // Don't allow spread, unknown, or computed properties
                        if (prop.type === 'SpreadProperty' ||
                            (prop.key.type === 'ComputedPropertyKey' &&
                                prop.key.value.type !== 'StringLiteral')) {
                            context.record(new records_1.EscapedCJSRefRecord(prop));
                            continue;
                        }
                        const key = prop.key.value;
                        let name;
                        if (key.type === 'Identifier') {
                            name = key.name;
                        }
                        else if (key.type === 'StringLiteral') {
                            name = key.value;
                        }
                        else {
                            // Unknown key literal
                            context.record(new records_1.EscapedCJSRefRecord(key));
                            continue;
                        }
                        let target = prop.type === 'ObjectMethod' ? prop : prop.value;
                        context.record(new records_1.ExportRecord({
                            type: 'local',
                            loc: utils_1.getDeclarationLoc(scope, target),
                            valueType: utils_1.getAnalyzeExportValueType(scope, target),
                            kind: 'value',
                            name,
                        }));
                    }
                }
                else {
                    const source = js_ast_utils_1.getRequireSource(node.right, scope);
                    if (source === undefined) {
                        context.record(new records_1.ExportRecord({
                            type: 'local',
                            loc: utils_1.getDeclarationLoc(scope, node.right),
                            valueType: utils_1.getAnalyzeExportValueType(scope, node.right),
                            kind: 'value',
                            name: 'default',
                        }));
                    }
                    else {
                        context.record(new records_1.ExportRecord({
                            type: 'externalAll',
                            loc: utils_1.getDeclarationLoc(scope, node.right),
                            kind: 'value',
                            source,
                        }));
                        context.record(new records_1.ExportRecord({
                            type: 'external',
                            kind: 'value',
                            loc: utils_1.getDeclarationLoc(scope, node.right),
                            imported: 'default',
                            exported: 'default',
                            source,
                        }));
                    }
                }
            }
            if (isExports) {
                const { parts } = js_ast_utils_1.getNodeReferenceParts(node.left);
                if (parts.length >= 2) {
                    // parts[0] is exports
                    const name = parts[1].value;
                    context.record(new records_1.ExportRecord({
                        type: 'local',
                        loc: utils_1.getDeclarationLoc(scope, node.right),
                        valueType: utils_1.getAnalyzeExportValueType(scope, node.right),
                        kind: 'value',
                        name,
                    }));
                }
            }
        }
        if (node.type === 'ReferenceIdentifier') {
            const binding = path.scope.getBinding(node.name);
            // Detect references to exports and module
            if (binding === undefined) {
                if (node.name === '__filename' ||
                    node.name === '__dirname' ||
                    node.name === 'require' ||
                    node.name === 'module' ||
                    node.name === 'exports') {
                    context.record(new records_1.CJSVarRefRecord(node));
                }
                if (node.name === 'module' || node.name === 'exports') {
                    const inMemberExpression = parent.type === 'MemberExpression' && parent.object === node;
                    if (!inMemberExpression) {
                        context.record(new records_1.EscapedCJSRefRecord(node));
                    }
                }
            }
        }
        return node;
    },
};
