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
function hasClassProps(node) {
    for (const bodyNode of node.meta.body) {
        if (bodyNode.type === 'ClassProperty') {
            return true;
        }
    }
    return false;
}
function createConstructor(rest, body) {
    return js_ast_1.classMethod.create({
        kind: 'constructor',
        key: js_ast_1.staticPropertyKey.quick(js_ast_1.identifier.quick('constructor')),
        meta: js_ast_1.classPropertyMeta.create({}),
        head: js_ast_1.functionHead.create({ params: [], rest }),
        body: js_ast_1.blockStatement.create({ body }),
    });
}
function toExpressionStatements(expressions) {
    return expressions.map((expr) => {
        return js_ast_1.expressionStatement.create({ expression: expr });
    });
}
function isSuperCall(node) {
    return node.type === 'CallExpression' && node.callee.type === 'Super';
}
function transformClass(node, scope, context) {
    const bodyReplacements = [];
    const constructorAssignments = [];
    const className = node.id === undefined ? scope.generateUid('class') : node.id.name;
    let _constructor = undefined;
    const filteredClassBody = [];
    for (const bodyNode of node.meta.body) {
        if (bodyNode.type === 'ClassMethod' && bodyNode.kind === 'constructor') {
            _constructor = bodyNode;
            continue;
        }
        if (bodyNode.type === 'ClassProperty') {
            if (bodyNode.value === undefined) {
                continue;
            }
            if (bodyNode.key.type === 'ComputedPropertyKey') {
                if (bodyNode.meta.static === true) {
                    bodyReplacements.push(js_ast_utils_1.template.statement `${className}[${bodyNode.key.value}] = ${bodyNode.value};`);
                }
                else {
                    constructorAssignments.push(js_ast_utils_1.template.expression `this[${bodyNode.key.value}] = ${bodyNode.value};`);
                }
            }
            else {
                if (bodyNode.meta.static === true) {
                    bodyReplacements.push(js_ast_utils_1.template.statement `${className}.${bodyNode.key.value} = ${bodyNode.value};`);
                }
                else {
                    constructorAssignments.push(js_ast_utils_1.template.expression `this.${bodyNode.key.value} = ${bodyNode.value};`);
                }
            }
        }
        else {
            filteredClassBody.push(bodyNode);
        }
    }
    if (constructorAssignments.length) {
        if (node.meta.superClass !== undefined) {
            if (_constructor) {
                const visited = new Set();
                // find super() and insert assignments
                const reducedConstructor = context.reduce(_constructor, [
                    {
                        name: 'classPropertiesInjector',
                        enter(path) {
                            const { node } = path;
                            if (visited.has(node)) {
                                return node;
                            }
                            if (isSuperCall(node) &&
                                path.parent.type !== 'ExpressionStatement') {
                                visited.add(node);
                                // TODO retain proper value of super()
                                return js_ast_1.sequenceExpression.create({
                                    expressions: [node, ...constructorAssignments],
                                });
                            }
                            if (node.type === 'ExpressionStatement' &&
                                isSuperCall(node.expression)) {
                                visited.add(node);
                                return [
                                    node,
                                    ...toExpressionStatements(constructorAssignments),
                                ];
                            }
                            return node;
                        },
                    },
                ]);
                _constructor = js_ast_1.classMethod.assert(reducedConstructor);
            }
            else {
                // create new constructor with a super() call and assignments
                _constructor = createConstructor(js_ast_1.bindingIdentifier.quick('args'), [
                    js_ast_utils_1.template.statement `super(...args);`,
                    ...toExpressionStatements(constructorAssignments),
                ]);
            }
        }
        else {
            if (_constructor) {
                // add assignments to end of constructor
                _constructor = {
                    ..._constructor,
                    body: {
                        ..._constructor.body,
                        body: [
                            ...toExpressionStatements(constructorAssignments),
                            ..._constructor.body.body,
                        ],
                    },
                };
            }
            else {
                // create new constructor with just the assignments
                _constructor = createConstructor(undefined, toExpressionStatements(constructorAssignments));
            }
        }
    }
    if (_constructor !== undefined) {
        filteredClassBody.unshift(_constructor);
    }
    const newClass = {
        ...node,
        id: node.id !== undefined && node.id.name === className
            ? node.id
            : js_ast_1.bindingIdentifier.create({
                name: className,
            }),
        meta: {
            ...node.meta,
            body: filteredClassBody,
        },
    };
    return {
        newClass,
        className,
        declarations: bodyReplacements,
    };
}
exports.default = {
    name: 'classProperties',
    enter(path) {
        const { node, scope, context } = path;
        // correctly replace an export class with the class node then append the declarations
        if ((node.type === 'ExportLocalDeclaration' ||
            node.type === 'ExportDefaultDeclaration') &&
            node.declaration !== undefined &&
            node.declaration.type === 'ClassDeclaration' &&
            hasClassProps(node.declaration)) {
            const { newClass, declarations } = transformClass(node.declaration, scope, context);
            return [
                {
                    ...node,
                    declaration: newClass,
                },
                ...declarations,
            ];
        }
        // turn a class expression into an IIFE that returns a class declaration
        if (node.type === 'ClassExpression' && hasClassProps(node)) {
            const className = node.id === undefined ? scope.generateUid('class') : node.id.name;
            return js_ast_1.callExpression.create({
                callee: js_ast_1.arrowFunctionExpression.create({
                    head: js_ast_1.functionHead.quick([]),
                    body: js_ast_1.blockStatement.create({
                        body: [
                            {
                                ...node,
                                type: 'ClassDeclaration',
                                id: js_ast_1.bindingIdentifier.quick(className),
                            },
                            js_ast_1.returnStatement.create({
                                argument: js_ast_1.referenceIdentifier.quick(className),
                            }),
                        ],
                    }),
                }),
                arguments: [],
            });
        }
        if (node.type === 'ClassDeclaration' && hasClassProps(node)) {
            const { newClass, declarations } = transformClass(node, scope, context);
            return [newClass, ...declarations];
        }
        return node;
    },
};
