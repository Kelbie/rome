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
const diagnostics_1 = require("@romejs/diagnostics");
function convertJSXIdentifier(path) {
    const { node } = path;
    if (node.type === 'JSXReferenceIdentifier') {
        if (node.name === 'this') {
            return js_ast_1.thisExpression.create({});
        }
        else {
            return js_ast_1.referenceIdentifier.create({
                name: node.name,
            }, node);
        }
    }
    else if (node.type === 'JSXIdentifier') {
        return js_ast_1.stringLiteral.quick(node.name);
    }
    else if (node.type === 'JSXMemberExpression') {
        let prop = convertJSXIdentifier(path.getChildPath('property'));
        if (prop.type === 'ReferenceIdentifier') {
            return js_ast_1.memberExpression.create({
                object: convertJSXIdentifier(path.getChildPath('object')),
                property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick(prop.name)),
            });
        }
        else {
            return js_ast_1.memberExpression.create({
                object: convertJSXIdentifier(path.getChildPath('object')),
                property: js_ast_1.computedMemberProperty.quick(prop),
            });
        }
    }
    else {
        throw new Error(`Received a node of type ${node.type}, the only node types that should be in this position are JSXIdentifier and JSXMemberExpression`);
    }
}
function convertAttributeValue(node) {
    if (node.type === 'JSXExpressionContainer') {
        return node.expression;
    }
    else {
        return node;
    }
}
function extractName(node) {
    if (node.type === 'JSXNamespacedName') {
        throw new Error('JSX is not XML blah blah blah');
    }
    else {
        return js_ast_1.jsxIdentifier.assert(node).name;
    }
}
function convertAttribute(node) {
    let valueNode = convertAttributeValue(node.value ||
        js_ast_1.booleanLiteral.create({
            value: true,
        }));
    if (valueNode.type === 'StringLiteral' &&
        (!node.value || node.value.type !== 'JSXExpressionContainer')) {
        valueNode = js_ast_1.stringLiteral.create({
            value: valueNode.value.replace(/\n\s+/g, ' '),
        });
    }
    const name = extractName(node.name);
    if (js_ast_utils_1.isValidIdentifierName(name)) {
        const nameNode = js_ast_1.identifier.create({
            name,
            loc: js_ast_utils_1.inheritLoc(node),
        });
        return js_ast_1.objectProperty.create({
            key: js_ast_1.staticPropertyKey.quick(nameNode),
            value: valueNode,
        });
    }
    else {
        return js_ast_1.objectProperty.create({
            key: js_ast_1.computedPropertyKey.quick(js_ast_1.stringLiteral.quick(name)),
            value: valueNode,
        });
    }
}
function pushProps(_props, objs) {
    if (!_props.length) {
        return _props;
    }
    objs.push(js_ast_1.objectExpression.create({ properties: _props }));
    return [];
}
function buildOpeningElementAttributes(attribs) {
    let _props = [];
    const objs = [];
    while (attribs.length > 0) {
        const prop = attribs.shift();
        if (prop.type === 'JSXSpreadAttribute') {
            _props = pushProps(_props, objs);
            objs.push(prop.argument);
        }
        else {
            _props.push(convertAttribute(prop));
        }
    }
    pushProps(_props, objs);
    let ret;
    if (objs.length === 1) {
        // only one object
        ret = objs[0];
    }
    else {
        // looks like we have multiple objects
        if (objs[0].type !== 'ObjectExpression') {
            objs.unshift(js_ast_1.objectExpression.create({ properties: [] }));
        }
        // spread it
        ret = js_ast_1.callExpression.create({
            callee: js_ast_utils_1.template.expression `Object.assign`,
            arguments: objs,
        });
    }
    return ret;
}
function cleanJSXElementLiteralChild(value) {
    const lines = value.split(/\r\n|\n|\r/);
    let lastNonEmptyLine = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/[^ \t]/)) {
            lastNonEmptyLine = i;
        }
    }
    let str = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isFirstLine = i === 0;
        const isLastLine = i === lines.length - 1;
        const isLastNonEmptyLine = i === lastNonEmptyLine;
        // replace rendered whitespace tabs with spaces
        let trimmedLine = line.replace(/\t/g, ' ');
        // trim whitespace touching a newline
        if (!isFirstLine) {
            trimmedLine = trimmedLine.replace(/^[ ]+/, '');
        }
        // trim whitespace touching an endline
        if (!isLastLine) {
            trimmedLine = trimmedLine.replace(/[ ]+$/, '');
        }
        if (trimmedLine) {
            if (!isLastNonEmptyLine) {
                trimmedLine += ' ';
            }
            str += trimmedLine;
        }
    }
    if (str !== '') {
        return js_ast_1.stringLiteral.quick(str);
    }
    else {
        return undefined;
    }
}
function buildChildren(children) {
    const elems = [];
    for (let child of children) {
        if (child.type === 'JSXText') {
            const node = cleanJSXElementLiteralChild(child.value);
            if (node !== undefined) {
                elems.push(node);
            }
            continue;
        }
        if (child.type === 'JSXExpressionContainer') {
            const { expression } = child;
            if (expression.type !== 'JSXEmptyExpression') {
                elems.push(child.expression);
            }
            continue;
        }
        if (child.type === 'JSXSpreadChild') {
            elems.push(js_ast_1.spreadElement.quick(child.expression));
            continue;
        }
        elems.push(child);
    }
    return elems;
}
exports.default = {
    name: 'jsx',
    enter(path) {
        const { node, context, parent } = path;
        if (js_ast_1.jsxElement.is(node)) {
            let type = convertJSXIdentifier(path.getChildPath('name'));
            if (js_ast_1.jsxNamespacedName.is(node.name)) {
                // TODO better handle this
                context.addNodeDiagnostic(type, diagnostics_1.descriptions.COMPILER.JSX_NOT_XML);
            }
            let attribs;
            if (node.attributes.length > 0) {
                attribs = buildOpeningElementAttributes(node.attributes);
            }
            else {
                attribs = js_ast_1.nullLiteral.create({});
            }
            const call = js_ast_1.callExpression.create({
                callee: js_ast_utils_1.template.expression `React.createElement`,
                arguments: [type, attribs, ...buildChildren(node.children)],
            });
            // If we're a JSX element child then we need to be wrapped
            if (js_ast_1.jsxElement.is(parent)) {
                return js_ast_1.jsxExpressionContainer.create({
                    expression: call,
                });
            }
            else {
                return call;
            }
        }
        if (node.type === 'JSXFragment') {
            const type = js_ast_utils_1.template.expression `React.Fragment`;
            const attribs = js_ast_utils_1.template.expression `null`;
            return js_ast_1.callExpression.create({
                callee: js_ast_utils_1.template.expression `React.createElement`,
                arguments: [type, attribs, ...buildChildren(node.children)],
            });
        }
        return node;
    },
};
