"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function isClassExtendsClause(node, parent) {
    return ((parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') &&
        parent.meta.superClass === node);
}
const parens = new Map();
exports.default = parens;
parens.set('TSAsExpression', () => true);
parens.set('TSAssignmentAsExpression', () => true);
parens.set('TSTypeAssertion', () => true);
parens.set('FlowNullableTypeAnnotation', (node, parent) => {
    return parent.type === 'FlowArrayTypeAnnotation';
});
parens.set('MemberExpression', (node, parent) => {
    if (node.property.optional) {
        return ((parent.type === 'CallExpression' && parent.callee === node) ||
            (parent.type === 'MemberExpression' && parent.object === node));
    }
    else {
        return false;
    }
});
parens.set('UpdateExpression', (node, parent) => {
    return (
    // (foo++).test(), (foo++)[0]
    (parent.type === 'MemberExpression' && parent.object === node) ||
        // (foo++)()
        (parent.type === 'CallExpression' && parent.callee === node) ||
        // new (foo++)()
        (parent.type === 'NewExpression' && parent.callee === node) ||
        isClassExtendsClause(node, parent));
});
parens.set('ObjectExpression', (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerArrow: true });
});
parens.set('DoExpression', (node, parent, printStack) => {
    return isFirstInStatement(printStack);
});
function needsParenLogicalExpression(node, parent) {
    if (node.operator === '**' &&
        parent.type === 'BinaryExpression' &&
        parent.operator === '**') {
        return parent.left === node;
    }
    // class A extends (B ?? C) {
    if (isClassExtendsClause(node, parent)) {
        return true;
    }
    // (f ?? g)()
    // (f ?? g)?.()
    // new (A ?? B)()
    if (parent.type === 'CallExpression' ||
        parent.type === 'OptionalCallExpression' ||
        parent.type === 'NewExpression') {
        return parent.callee === node;
    }
    // ...(a ?? b)
    // await (a ?? b)
    if (js_ast_utils_1.isUnaryLike(parent) || parent.type === 'AwaitExpression') {
        return true;
    }
    // (a ?? b).x
    // (a ?? b)?.x
    if (parent.type === 'MemberExpression' && parent.object === node) {
        return true;
    }
    // (a ?? b) ?? c
    // a ?? (b ?? c)
    if (parent.type === 'LogicalExpression') {
        if (node.type === 'LogicalExpression') {
            return node.operator !== parent.operator;
        }
    }
    if (js_ast_utils_1.isBinary(parent)) {
        const parentOp = parent.operator;
        const parentPos = js_ast_utils_1.getPrecedence(parentOp);
        const nodeOp = node.operator;
        const nodePos = js_ast_utils_1.getPrecedence(nodeOp);
        if (
        // Logical expressions with the same precedence don't need parens.
        (parentPos === nodePos &&
            parent.right === node &&
            parent.type !== 'LogicalExpression') ||
            parentPos > nodePos) {
            return true;
        }
    }
    return false;
}
parens.set('LogicalExpression', needsParenLogicalExpression);
parens.set('BinaryExpression', (node, parent) => {
    // let i = (1 in []);
    // for ((1 in []);;);
    if (node.operator === 'in' &&
        (parent.type === 'VariableDeclarator' || js_ast_utils_1.isFor(parent))) {
        return true;
    }
    return needsParenLogicalExpression(node, parent);
});
parens.set('SequenceExpression', (node, parent) => {
    if (
    // Although parentheses wouldn't hurt around sequence
    // expressions in the head of for loops, traditional style
    // dictates that e.g. i++, j++ should not be wrapped with
    // parentheses.
    parent.type === 'ForStatement' ||
        parent.type === 'ThrowStatement' ||
        parent.type === 'ReturnStatement' ||
        (parent.type === 'IfStatement' && parent.test === node) ||
        (parent.type === 'WhileStatement' && parent.test === node) ||
        (parent.type === 'ForInStatement' && parent.right === node) ||
        (parent.type === 'SwitchStatement' && parent.discriminant === node) ||
        (parent.type === 'ExpressionStatement' && parent.expression === node)) {
        return false;
    }
    // Arrow function builder handles the parens printing.
    if (parent.type === 'ArrowFunctionExpression') {
        return false;
    }
    // Otherwise err on the side of overparenthesization, adding
    // explicit exceptions above if this proves overzealous.
    return true;
});
function needsParenYieldExpression(node, parent) {
    return (js_ast_utils_1.isBinary(parent) ||
        js_ast_utils_1.isUnaryLike(parent) ||
        parent.type === 'MemberExpression' ||
        (parent.type === 'CallExpression' && parent.callee === node) ||
        (parent.type === 'NewExpression' && parent.callee === node) ||
        (parent.type === 'AwaitExpression' && node.type === 'YieldExpression') ||
        (parent.type === 'ConditionalExpression' && node === parent.test) ||
        isClassExtendsClause(node, parent));
}
parens.set('YieldExpression', needsParenYieldExpression);
parens.set('AwaitExpression', needsParenYieldExpression);
parens.set('OptionalCallExpression', (node, parent) => {
    return ((parent.type === 'CallExpression' && parent.callee === node) ||
        (parent.type === 'MemberExpression' && parent.object === node));
});
parens.set('ClassExpression', (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
});
function needsParenUnaryExpression(node, parent) {
    return ((parent.type === 'MemberExpression' && parent.object === node) ||
        (parent.type === 'CallExpression' && parent.callee === node) ||
        (parent.type === 'NewExpression' && parent.callee === node) ||
        (parent.type === 'BinaryExpression' &&
            parent.operator === '**' &&
            parent.left === node) ||
        isClassExtendsClause(node, parent));
}
parens.set('UnaryExpression', needsParenUnaryExpression);
parens.set('SpreadElement', needsParenUnaryExpression);
parens.set('SpreadProperty', needsParenUnaryExpression);
parens.set('FunctionExpression', (node, parent, printStack) => {
    return isFirstInStatement(printStack, { considerDefaultExports: true });
});
parens.set('ArrowFunctionExpression', (node, parent) => {
    return (parent.type === 'ExportLocalDeclaration' ||
        needsParenConditionalExpression(node, parent));
});
function needsParenConditionalExpression(node, parent) {
    if (js_ast_utils_1.isUnaryLike(parent) ||
        js_ast_utils_1.isBinary(parent) ||
        (parent.type === 'ConditionalExpression' && parent.test === node) ||
        parent.type === 'AwaitExpression' ||
        (parent.type === 'MemberExpression' &&
            parent.object === node &&
            parent.property.optional) ||
        (parent.type === 'OptionalCallExpression' && parent.callee === node) ||
        parent.type === 'TaggedTemplateExpression' ||
        parent.type === 'TSTypeAssertion' ||
        parent.type === 'TSAsExpression') {
        return true;
    }
    return needsParenUnaryExpression(node, parent);
}
parens.set('ConditionalExpression', needsParenConditionalExpression);
parens.set('AssignmentExpression', (node, parent) => {
    if (node.left.type === 'AssignmentObjectPattern') {
        return true;
    }
    else {
        return needsParenConditionalExpression(node, parent);
    }
});
function needsParenUnionTypeAnnotation(node, parent) {
    return (parent.type === 'FlowArrayTypeAnnotation' ||
        parent.type === 'FlowNullableTypeAnnotation' ||
        parent.type === 'IntersectionTypeAnnotation' ||
        parent.type === 'UnionTypeAnnotation' ||
        parent.type === 'TSArrayType' ||
        parent.type === 'TSOptionalType');
}
parens.set('UnionTypeAnnotation', needsParenUnionTypeAnnotation);
parens.set('IntersectionTypeAnnotation', needsParenUnionTypeAnnotation);
parens.set('TSInferType', (node, parent) => {
    return parent.type === 'TSArrayType' || parent.type === 'TSOptionalType';
});
parens.set('FlowFunctionTypeAnnotation', (node, parent, printStack) => {
    // Check if we are the return type of an arrow
    for (const printNode of printStack) {
        if (printNode.type === 'ArrowFunctionExpression' &&
            printNode.head.returnType === node) {
            return true;
        }
    }
    // ((a: () => A) => (a: A) => A)
    if (node.returnType !== undefined &&
        node.returnType.type === 'FlowFunctionTypeAnnotation') {
        return true;
    }
    return (
    // (() => A) | (() => B)
    parent.type === 'UnionTypeAnnotation' ||
        // (() => A) & (() => B)
        parent.type === 'IntersectionTypeAnnotation' ||
        // (() => A)[]
        parent.type === 'FlowArrayTypeAnnotation');
});
// Walk up the print stack to deterimine if our node can come first
// in statement.
function isFirstInStatement(printStack, { considerArrow = false, considerDefaultExports = false } = {}) {
    let i = printStack.length - 1;
    let node = printStack[i];
    i--;
    let parent = printStack[i];
    while (i > 0) {
        if ((parent.type === 'ExpressionStatement' && parent.expression === node) ||
            parent.type === 'TaggedTemplateExpression' ||
            (considerDefaultExports &&
                parent.type === 'ExportDefaultDeclaration' &&
                parent.declaration === node) ||
            (considerArrow &&
                parent.type === 'ArrowFunctionExpression' &&
                parent.body === node)) {
            return true;
        }
        if ((parent.type === 'CallExpression' && parent.callee === node) ||
            (parent.type === 'SequenceExpression' && parent.expressions[0] === node) ||
            (parent.type === 'MemberExpression' && parent.object === node) ||
            (js_ast_utils_1.isConditional(parent) && parent.test === node) ||
            (js_ast_utils_1.isBinary(parent) && parent.left === node) ||
            (parent.type === 'AssignmentExpression' && parent.left === node)) {
            node = parent;
            i--;
            parent = printStack[i];
        }
        else {
            return false;
        }
    }
    return false;
}
