"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../tokenizer/types");
const index_1 = require("./index");
const diagnostics_1 = require("@romejs/diagnostics");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
// Indicates whether we should create a JSXIdentifier or a JSXReferenceIdentifier
function isHTMLTagName(tagName) {
    return /^[a-z]|-/.test(tagName) && js_ast_utils_1.isValidIdentifierName(tagName);
}
// Transforms JSX element name to string.
function getQualifiedJSXName(node) {
    if (node === undefined) {
        return '';
    }
    switch (node.type) {
        case 'JSXIdentifier':
        case 'JSXReferenceIdentifier':
            return node.name;
        case 'JSXNamespacedName':
            return `${node.namespace.name}:${node.name.name}`;
        case 'JSXMemberExpression':
            return `${getQualifiedJSXName(node.object)}.${getQualifiedJSXName(node.property)}`;
    }
}
// Parse next token as JSX identifier
function parseJSXIdentifier(parser) {
    const start = parser.getPosition();
    let name;
    if (parser.match(types_1.types.jsxName)) {
        name = String(parser.state.tokenValue);
    }
    else if (parser.state.tokenType.keyword !== undefined) {
        name = parser.state.tokenType.keyword;
    }
    else {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.JSX_UNKNOWN_IDENTIFIER_TOKEN,
        });
        name = '';
    }
    parser.next();
    return parser.finishNode(start, {
        type: 'JSXIdentifier',
        name,
    });
}
// Parse namespaced identifier.
function parseJSXNamespacedName(parser) {
    const start = parser.getPosition();
    const namespace = parseJSXIdentifier(parser);
    if (!parser.eat(types_1.types.colon)) {
        return namespace;
    }
    const name = parseJSXIdentifier(parser);
    return parser.finishNode(start, {
        type: 'JSXNamespacedName',
        name,
        namespace,
    });
}
// Parses element name in any form - namespaced, member
// or single identifier.
function parseJSXElementName(parser) {
    const start = parser.getPosition();
    const namespacedName = parseJSXNamespacedName(parser);
    let node;
    if (namespacedName.type === 'JSXIdentifier' &&
        !isHTMLTagName(namespacedName.name)) {
        node = {
            ...namespacedName,
            type: 'JSXReferenceIdentifier',
        };
    }
    else {
        node = namespacedName;
    }
    while (parser.eat(types_1.types.dot)) {
        const property = parseJSXIdentifier(parser);
        node = parser.finishNode(start, {
            type: 'JSXMemberExpression',
            object: node,
            property,
        });
    }
    return node;
}
// Parses any type of JSX attribute value.
function parseJSXAttributeValue(parser) {
    let node;
    switch (parser.state.tokenType) {
        case types_1.types.braceL: {
            node = parseJSXExpressionContainer(parser);
            if (node.expression.type === 'JSXEmptyExpression') {
                parser.addDiagnostic({
                    loc: node.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.JSX_EMPTY_ATTRIBUTE_VALUE,
                });
            }
            return node;
        }
        case types_1.types.jsxTagStart:
            return parseJSXElement(parser);
        case types_1.types.string:
            return index_1.parseStringLiteral(parser);
        default: {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.JSX_INVALID_ATTRIBUTE_VALUE,
            });
            return parser.finishNode(parser.getPosition(), {
                type: 'StringLiteral',
                value: '?',
            });
        }
    }
}
// JSXEmptyExpression is unique type since it doesn't actually parse anything,
// and so it should start at the end of last read token (left brace) and finish
// at the beginning of the next one (right brace).
function parseJSXEmptyExpression(parser) {
    return parser.finishNode(parser.state.lastEndPos, {
        type: 'JSXEmptyExpression',
    });
}
// Parse JSX spread child
function parseJSXSpreadChild(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'jsx spread child');
    parser.expect(types_1.types.ellipsis);
    const expression = index_1.parseExpression(parser, 'jsx spread child expression');
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'JSXSpreadChild',
        expression,
    });
}
// Parses JSX expression enclosed into curly brackets.
function parseJSXExpressionContainer(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'jsx expression container');
    let expression;
    if (parser.match(types_1.types.braceR)) {
        expression = parseJSXEmptyExpression(parser);
    }
    else {
        expression = index_1.parseExpression(parser, 'jsx inner expression container');
    }
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'JSXExpressionContainer',
        expression,
    });
}
// Parses following JSX attribute name-value pair.
function parseJSXAttribute(parser) {
    const start = parser.getPosition();
    if (parser.match(types_1.types.braceL)) {
        const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'jsx attribute spread');
        parser.expect(types_1.types.ellipsis);
        const argument = index_1.parseMaybeAssign(parser, 'jsx attribute spread');
        parser.expectClosing(openContext);
        return parser.finishNode(start, {
            type: 'JSXSpreadAttribute',
            argument,
        });
    }
    const name = parseJSXNamespacedName(parser);
    const value = parser.eat(types_1.types.eq) ? parseJSXAttributeValue(parser) : undefined;
    return parser.finishNode(start, {
        type: 'JSXAttribute',
        name,
        value,
    });
}
// Parses JSX opening tag starting after "<".
function parseJSXOpeningElementAt(parser, start) {
    if (parser.match(types_1.types.jsxTagEnd)) {
        parser.expect(types_1.types.jsxTagEnd);
        return {
            typeArguments: undefined,
            name: undefined,
            loc: {
                filename: parser.filename,
                start,
                end: parser.getPosition(),
            },
            attributes: [],
            selfClosing: false,
        };
    }
    const attributes = [];
    const name = parseJSXElementName(parser);
    let typeArguments;
    if (parser.isRelational('<')) {
        if (!parser.isSyntaxEnabled('ts')) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.JSX_ELEM_TYPE_ARGUMENTS_OUTSIDE_TS,
            });
        }
        typeArguments = index_1.parseTSTypeArguments(parser);
    }
    // We need to check for isRelational('>') here as the above type arguments parsing can put the tokenizer
    // into an unusual state for: <foo<bar>></foo>
    while (!parser.match(types_1.types.slash) &&
        !parser.match(types_1.types.jsxTagEnd) &&
        !parser.atEOF()) {
        attributes.push(parseJSXAttribute(parser));
    }
    const selfClosing = parser.eat(types_1.types.slash);
    if (!parser.eat(types_1.types.jsxTagEnd)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.JSX_UNCLOSED_SELF_CLOSING_TAG,
        });
    }
    return {
        typeArguments,
        name,
        attributes,
        selfClosing,
        loc: parser.getLoc(name),
    };
}
// Parses JSX closing tag starting after "</".
function parseJSXClosingElementAt(parser) {
    if (parser.eat(types_1.types.jsxTagEnd)) {
        return undefined;
    }
    const name = parseJSXElementName(parser);
    if (!parser.eat(types_1.types.jsxTagEnd)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.JSX_UNCLOSED_CLOSING_TAG,
        });
    }
    return name;
}
function recoverFromUnclosedJSX(parser) {
    // jsxOpenTag
    parser.state.context.pop();
    parser.state.exprAllowed = false;
}
// Parses entire JSX element, including it"s opening tag
// (starting after "<"), attributes, contents and closing tag.
function parseJSXElementAt(parser, start) {
    const children = [];
    const openingDef = parseJSXOpeningElementAt(parser, start);
    let closingNameLoc;
    let closingName;
    // Parse children for unclosed elements
    if (openingDef.selfClosing === false) {
        contents: while (true) {
            switch (parser.state.tokenType) {
                case types_1.types.jsxTagStart: {
                    const start = parser.getPosition();
                    parser.next();
                    if (parser.eat(types_1.types.slash)) {
                        closingName = parseJSXClosingElementAt(parser);
                        closingNameLoc = {
                            filename: parser.filename,
                            start,
                            end: parser.getPosition(),
                        };
                        break contents;
                    }
                    children.push(parseJSXElementAt(parser, start));
                    break;
                }
                case types_1.types.jsxText: {
                    children.push(parseJSXText(parser));
                    break;
                }
                case types_1.types.braceL: {
                    if (parser.lookaheadState().tokenType === types_1.types.ellipsis) {
                        children.push(parseJSXSpreadChild(parser));
                    }
                    else {
                        children.push(parseJSXExpressionContainer(parser));
                    }
                    break;
                }
                case types_1.types.eof: {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.JSX_UNCLOSED_ELEMENT(getQualifiedJSXName(openingDef.name), openingDef.loc),
                    });
                    break contents;
                }
                default: {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.JSX_UNKNOWN_CHILD_START(getQualifiedJSXName(openingDef.name), openingDef.loc),
                    });
                    // We don't need to do it for the tt.eof case above because nothing will ever be parsed after
                    recoverFromUnclosedJSX(parser);
                    break contents;
                }
            }
        }
        // Unclosed element, would have produced an error above but we still want to produce a valid AST and avoid the below error conditions
        if (closingNameLoc === undefined) {
            closingName = openingDef.name;
            closingNameLoc = openingDef.loc;
        }
        // Fragment open, element close
        if (openingDef.name === undefined && closingName !== undefined) {
            parser.addDiagnostic({
                loc: openingDef.loc,
                description: diagnostics_1.descriptions.JS_PARSER.JSX_EXPECTED_CLOSING_FRAGMENT_TAG(getQualifiedJSXName(openingDef.name), openingDef.loc),
            });
        }
        // Element open, fragment close
        if (openingDef.name !== undefined && closingName === undefined) {
            parser.addDiagnostic({
                loc: openingDef.loc,
                description: diagnostics_1.descriptions.JS_PARSER.JSX_EXPECTED_CLOSING_TAG(getQualifiedJSXName(openingDef.name), openingDef.loc),
            });
        }
        // Validate element names: Element open, element close
        if (openingDef.name !== undefined && closingName !== undefined) {
            if (getQualifiedJSXName(closingName) !==
                getQualifiedJSXName(openingDef.name)) {
                parser.addDiagnostic({
                    loc: openingDef.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.JSX_EXPECTED_CLOSING_TAG(getQualifiedJSXName(openingDef.name), openingDef.loc),
                });
            }
        }
    }
    checkAccidentalFragment(parser);
    const openingName = openingDef.name;
    if (openingName === undefined) {
        return parser.finishNode(start, {
            type: 'JSXFragment',
            children,
        });
    }
    else {
        return parser.finishNode(start, {
            type: 'JSXElement',
            name: openingName,
            typeArguments: openingDef.typeArguments,
            attributes: openingDef.attributes,
            selfClosing: openingDef.selfClosing,
            children,
        });
    }
}
function checkAccidentalFragment(parser) {
    if (parser.match(types_1.types.relational) && parser.state.tokenValue === '<') {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.UNWRAPPED_ADJACENT_JHX,
        });
    }
}
function parseJSXText(parser) {
    // No need to assert syntax here because we wont get that far as parseJSXElement would have already been called
    const start = parser.getPosition();
    const value = String(parser.state.tokenValue);
    parser.next();
    return parser.finishNode(start, {
        type: 'JSXText',
        value,
    });
}
exports.parseJSXText = parseJSXText;
// Parses entire JSX element from 'current position.
function parseJSXElement(parser) {
    // Only necessary here as this is the only JSX entry point
    if (!parser.isSyntaxEnabled('jsx')) {
        if (parser.isSyntaxEnabled('ts')) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.JSX_IN_TS_EXTENSION,
            });
        }
        else {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.JSX_DISABLED,
            });
        }
    }
    const start = parser.getPosition();
    parser.next();
    return parseJSXElementAt(parser, start);
}
exports.parseJSXElement = parseJSXElement;
