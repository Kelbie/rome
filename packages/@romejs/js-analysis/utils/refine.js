"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const RefinedT_1 = require("../types/RefinedT");
const UnionT_1 = require("../types/UnionT");
const RefineTypeofT_1 = require("../types/RefineTypeofT");
function typesToMap(types) {
    const map = new Map();
    for (const { name, value } of types) {
        map.set(name, value);
    }
    return map;
}
function isTypeofNode(node) {
    return (node.type === 'UnaryExpression' &&
        node.operator === 'typeof' &&
        node.argument.type === 'ReferenceIdentifier');
}
function genTypes(node, scope) {
    const evaluator = scope.evaluator;
    let types = [];
    switch (node.type) {
        case 'BinaryExpression': {
            const { left, right } = node;
            switch (node.operator) {
                case '==':
                    return [];
                case '!=':
                    return [];
                case '===': {
                    // typeof foo === 'string'
                    if (isTypeofNode(left)) {
                        const name = left.argument.name;
                        const binding = scope.getBinding(name);
                        if (binding !== undefined) {
                            types.push({
                                name,
                                value: new RefineTypeofT_1.default(scope, node, evaluator.getTypeFromEvaluatedNode(right), binding),
                            });
                        }
                    }
                    // foo === 'bar'
                    if (left.type === 'ReferenceIdentifier') {
                        types.push({
                            name: left.name,
                            value: evaluator.getTypeFromEvaluatedNode(right),
                        });
                    }
                    // 'string' === typeof foo
                    if (isTypeofNode(right)) {
                        const name = right.argument.name;
                        const binding = scope.getBinding(name);
                        if (binding !== undefined) {
                            types.push({
                                name,
                                value: new RefineTypeofT_1.default(scope, node, evaluator.getTypeFromEvaluatedNode(left), binding),
                            });
                        }
                    }
                    // 'bar' === foo
                    if (right.type === 'ReferenceIdentifier') {
                        types.push({
                            name: right.name,
                            value: evaluator.getTypeFromEvaluatedNode(left),
                        });
                    }
                    break;
                }
                case '!==': {
                    // TODO add `typeof`
                    if (left.type === 'ReferenceIdentifier') {
                        types.push({
                            name: left.name,
                            value: new RefinedT_1.default(scope, left, evaluator.getTypeFromEvaluatedNode(left), evaluator.getTypeFromEvaluatedNode(right)),
                        });
                    }
                    if (right.type === 'ReferenceIdentifier') {
                        types.push({
                            name: right.name,
                            value: new RefinedT_1.default(scope, right, evaluator.getTypeFromEvaluatedNode(right), evaluator.getTypeFromEvaluatedNode(left)),
                        });
                    }
                    return types;
                }
                case 'instanceof':
                    return [];
                default:
                    throw new Error('Unknown BinaryExpression operator');
            }
            break;
        }
        case 'LogicalExpression':
            switch (node.operator) {
                case '||': {
                    const leftMap = typesToMap(genTypes(node.left, scope));
                    const rightMap = typesToMap(genTypes(node.right, scope));
                    const names = new Set([...leftMap.keys(), ...rightMap.keys()]);
                    return Array.from(names, (name) => {
                        const left = leftMap.get(name);
                        const right = rightMap.get(name);
                        let type;
                        if (left === undefined) {
                            type = right;
                        }
                        else if (right === undefined) {
                            type = left;
                        }
                        else {
                            type = new UnionT_1.default(scope, undefined, [left, right]);
                        }
                        if (type === undefined) {
                            throw new Error('Expected type');
                        }
                        return {
                            name,
                            value: type,
                        };
                    });
                }
                case '&&':
                    return [...genTypes(node.left, scope), ...genTypes(node.right, scope)];
            }
    }
    return types;
}
function refine(test, outerScope, hasAlternate) {
    const consequent = outerScope.fork();
    const alternate = outerScope.fork();
    const rawTestTypes = genTypes(test, outerScope);
    const testTypes = new Map();
    for (const { name, value } of rawTestTypes) {
        let types = testTypes.get(name);
        if (types === undefined) {
            types = [];
            testTypes.set(name, types);
        }
        types.push(value);
    }
    for (const [name, types] of testTypes) {
        // Build up the type in the case it's been refined to multiple values
        const type = types.length === 1 ? types[0] : new UnionT_1.default(outerScope, undefined, types);
        // Set type on `consequent`
        consequent.addBinding(name, type);
        // Remove type from '`alternate`
        if (hasAlternate) {
            const binding = outerScope.getBindingAssert(name);
            const opposite = new RefinedT_1.default(outerScope, type.originNode, binding, type);
            alternate.addBinding(name, opposite);
        }
    }
    // TODO, get binding refinements that were made inside
    return { consequent, alternate };
}
exports.default = refine;
