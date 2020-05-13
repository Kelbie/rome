"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const types_1 = require("../tokenizer/types");
const index_1 = require("./index");
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
const expression_1 = require("./expression");
const VALID_REST_ARGUMENT_TYPES = ['Identifier', 'MemberExpression'];
// Convert existing expression atom to assignable pattern if possible.
function toAssignmentPattern(parser, node, contextDescription) {
    switch (node.type) {
        case 'AssignmentObjectPattern':
        case 'AssignmentArrayPattern':
        case 'AssignmentAssignmentPattern':
        case 'AssignmentObjectPatternProperty':
        case 'AssignmentIdentifier':
        case 'MemberExpression':
            return node;
        case 'AmbiguousFlowTypeCastExpression':
            return toAssignmentPattern(parser, index_1.ambiguousTypeCastToParameter(parser, node), contextDescription);
        case 'BindingIdentifier':
        case 'ReferenceIdentifier':
            return expression_1.toAssignmentIdentifier(parser, node);
        case 'TSAsExpression':
            return {
                ...node,
                type: 'TSAssignmentAsExpression',
                expression: toTargetAssignmentPattern(parser, node.expression, contextDescription),
            };
        case 'TSNonNullExpression':
            return {
                ...node,
                type: 'TSAssignmentNonNullExpression',
                expression: toTargetAssignmentPattern(parser, node.expression, contextDescription),
            };
        case 'TSTypeAssertion':
            return {
                ...node,
                type: 'TSAssignmentTypeAssertion',
                expression: toTargetAssignmentPattern(parser, node.expression, contextDescription),
            };
        case 'ObjectExpression': {
            const props = [];
            let rest;
            for (let index = 0; index < node.properties.length; index++) {
                const prop = node.properties[index];
                if (prop.type === 'SpreadProperty') {
                    const arg = toTargetAssignmentPattern(parser, prop.argument, contextDescription);
                    if (arg.type === 'AssignmentIdentifier') {
                        rest = arg;
                    }
                    else {
                        parser.addDiagnostic({
                            loc: arg.loc,
                            description: diagnostics_1.descriptions.JS_PARSER.INVALID_OBJECT_REST_ARGUMENT,
                        });
                    }
                    continue;
                }
                props.push(toAssignmentObjectProperty(parser, prop));
            }
            return {
                type: 'AssignmentObjectPattern',
                loc: node.loc,
                properties: props,
                rest,
            };
        }
        case 'ArrayExpression': {
            const { list: elements, rest } = toAssignableList(parser, node.elements, contextDescription);
            return {
                type: 'AssignmentArrayPattern',
                loc: node.loc,
                elements,
                rest,
            };
        }
        case 'AssignmentExpression': {
            if (node.operator !== '=') {
                parser.addDiagnostic({
                    loc: parser.getLoc(node.left),
                    description: diagnostics_1.descriptions.JS_PARSER.INVALID_ASSIGNMENT_PATTERN_OPERATOR,
                });
            }
            return {
                ...node,
                type: 'AssignmentAssignmentPattern',
                left: toTargetAssignmentPattern(parser, node.left, contextDescription),
                right: node.right,
                loc: node.loc,
            };
        }
        default: {
            parser.addDiagnostic({
                loc: node.loc,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_LEFT_HAND_SIDE(contextDescription),
            });
            return expression_1.toAssignmentIdentifier(parser, parser.createUnknownIdentifier(contextDescription));
        }
    }
}
exports.toAssignmentPattern = toAssignmentPattern;
function toTargetAssignmentPattern(parser, node, contextDescription) {
    const binding = toAssignmentPattern(parser, node, contextDescription);
    switch (binding.type) {
        case 'AssignmentIdentifier':
        case 'AssignmentArrayPattern':
        case 'AssignmentObjectPattern':
        case 'MemberExpression':
        case 'TSAssignmentAsExpression':
        case 'TSAssignmentNonNullExpression':
        case 'TSAssignmentTypeAssertion':
            return binding;
        default: {
            parser.addDiagnostic({
                loc: node.loc,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_ASSIGNMENT_TARGET,
            });
            return {
                type: 'AssignmentIdentifier',
                loc: node.loc,
                name: 'X',
            };
        }
    }
}
exports.toTargetAssignmentPattern = toTargetAssignmentPattern;
function toTargetBindingPattern(parser, node, contextDescription) {
    const binding = toBindingPattern(parser, node, contextDescription);
    switch (binding.type) {
        case 'BindingIdentifier':
        case 'BindingArrayPattern':
        case 'BindingObjectPattern':
            return binding;
        default:
            // TODO return Unknown
            throw new Error(`TODO ${binding.type}`);
    }
}
exports.toTargetBindingPattern = toTargetBindingPattern;
function toParamBindingPattern(parser, node, contextDescription) {
    const binding = toBindingPattern(parser, node, contextDescription);
    switch (binding.type) {
        case 'BindingIdentifier':
        case 'BindingArrayPattern':
        case 'BindingObjectPattern':
        case 'BindingAssignmentPattern':
            return binding;
        default:
            // TODO return Unknown
            throw new Error(`TODO ${binding.type}`);
    }
}
exports.toParamBindingPattern = toParamBindingPattern;
function toBindingPattern(parser, node, contextDescription) {
    const binding = toAssignmentPattern(parser, node, contextDescription);
    if (binding.type === 'MemberExpression') {
        parser.addDiagnostic({
            loc: node.loc,
            description: diagnostics_1.descriptions.JS_PARSER.BINDING_MEMBER_EXPRESSION,
        });
        return {
            type: 'BindingIdentifier',
            name: 'X',
            loc: node.loc,
        };
    }
    switch (binding.type) {
        case 'AssignmentObjectPattern': {
            const newNode = {
                ...binding,
                type: 'BindingObjectPattern',
                rest: binding.rest === undefined
                    ? undefined
                    : expression_1.toBindingIdentifier(parser, binding.rest),
                properties: binding.properties.map((prop) => {
                    const bindingProp = toBindingPattern(parser, prop, contextDescription);
                    if (bindingProp.type !== 'BindingObjectPatternProperty') {
                        throw new Error('impossible condition');
                    }
                    return bindingProp;
                }),
            };
            return newNode;
        }
        case 'AssignmentAssignmentPattern': {
            const newNode = {
                ...binding,
                type: 'BindingAssignmentPattern',
                left: toTargetBindingPattern(parser, binding.left, contextDescription),
            };
            return newNode;
        }
        case 'AssignmentArrayPattern': {
            const newNode = {
                ...binding,
                type: 'BindingArrayPattern',
                elements: binding.elements.map((elem) => elem.type === 'ArrayHole'
                    ? elem
                    : toParamBindingPattern(parser, elem, contextDescription)),
                rest: binding.rest === undefined
                    ? undefined
                    : toTargetBindingPattern(parser, binding.rest, contextDescription),
            };
            return newNode;
        }
        case 'AssignmentIdentifier': {
            const newNode = {
                ...binding,
                type: 'BindingIdentifier',
            };
            return newNode;
        }
        case 'AssignmentObjectPatternProperty': {
            const newNode = {
                ...binding,
                type: 'BindingObjectPatternProperty',
                value: toBindingPattern(parser, binding.value, contextDescription),
            };
            return newNode;
        }
        default:
            throw new Error(`Unknown node ${node.type}`);
    }
}
exports.toBindingPattern = toBindingPattern;
function toAssignmentObjectProperty(parser, prop) {
    switch (prop.type) {
        case 'ObjectMethod': {
            parser.addDiagnostic({
                loc: prop.key.loc,
                description: diagnostics_1.descriptions.JS_PARSER.OBJECT_PATTERN_CANNOT_CONTAIN_METHODS,
            });
            const fakeProp = {
                type: 'AssignmentObjectPatternProperty',
                loc: prop.loc,
                key: {
                    type: 'StaticPropertyKey',
                    value: {
                        type: 'Identifier',
                        name: 'X',
                        loc: prop.loc,
                    },
                    loc: prop.loc,
                },
                value: {
                    type: 'AssignmentIdentifier',
                    name: 'X',
                    loc: prop.loc,
                },
            };
            return fakeProp;
        }
        case 'ObjectProperty':
            return {
                ...prop,
                type: 'AssignmentObjectPatternProperty',
                value: toAssignmentPattern(parser, prop.value, 'assignment object property value'),
            };
        default: {
            parser.addDiagnostic({
                loc: prop.loc,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_OBJECT_PATTERN_PROPERTY,
            });
            return {
                type: 'AssignmentObjectPatternProperty',
                loc: prop.loc,
                key: {
                    type: 'StaticPropertyKey',
                    loc: prop.loc,
                    value: {
                        type: 'Identifier',
                        loc: prop.loc,
                        name: 'X',
                    },
                },
                value: {
                    type: 'AssignmentIdentifier',
                    loc: prop.loc,
                    name: 'X',
                },
            };
        }
    }
}
exports.toAssignmentObjectProperty = toAssignmentObjectProperty;
function toAssignableList(parser, exprList, contextDescription) {
    const newList = [];
    let rest;
    let end = exprList.length;
    // Validate last element
    if (end > 0) {
        let last = exprList[end - 1];
        if (last !== undefined && last.type === 'SpreadElement') {
            const arg = toTargetAssignmentPattern(parser, last.argument, contextDescription);
            rest = arg;
            end--;
        }
        if (last !== undefined &&
            last.type === 'AmbiguousFlowTypeCastExpression' &&
            last.expression.type === 'SpreadElement') {
            rest = index_1.ambiguousTypeCastToParameter(parser, {
                ...last,
                expression: last.expression.argument,
            });
            end--;
        }
    }
    // Turn type casts that we found in function parameter head into type annotated params
    for (let i = 0; i < end; i++) {
        const expr = exprList[i];
        if (expr.type === 'AmbiguousFlowTypeCastExpression') {
            exprList[i] = index_1.ambiguousTypeCastToParameter(parser, expr);
        }
        if (expr.type === 'TSAsExpression' || expr.type === 'TSTypeAssertion') {
            parser.addDiagnostic({
                loc: expr.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TS_UNEXPECTED_CAST_IN_PARAMETER_POSITION,
            });
        }
    }
    for (let i = 0; i < end; i++) {
        const elt = exprList[i];
        if (elt.type === 'SpreadElement') {
            raiseRestNotLast(parser, parser.getLoc(elt));
        }
        if (elt.type === 'ArrayHole') {
            newList.push(elt);
            continue;
        }
        const assign = toAssignmentPattern(parser, elt, contextDescription);
        newList.push(assign);
    }
    return { list: newList, rest };
}
exports.toAssignableList = toAssignableList;
function toFunctionParamsBindingList(parser, exprList, contextDescription) {
    const bindingList = [];
    const { list: assignmentList, rest: assignmentRest } = toAssignableList(parser, exprList, contextDescription);
    const bindingRest = assignmentRest === undefined
        ? assignmentRest
        : toTargetBindingPattern(parser, assignmentRest, contextDescription);
    for (const item of assignmentList) {
        if (item === undefined) {
            // TODO should never happen?
            continue;
        }
        if (item.type === 'AssignmentAssignmentPattern') {
            const binding = toBindingPattern(parser, item, contextDescription);
            if (binding.type !== 'BindingAssignmentPattern') {
                throw new Error('TODO');
            }
            bindingList.push(binding);
            continue;
        }
        const binding = toTargetBindingPattern(parser, item, contextDescription);
        bindingList.push(binding);
    }
    return { params: bindingList, rest: bindingRest };
}
exports.toFunctionParamsBindingList = toFunctionParamsBindingList;
// this is a list of nodes, from 'something like a call expression, we need to filter the
// type casts that we've found that are illegal in this context
function toReferencedList(parser, exprList, isParenthesizedExpr) {
    for (let i = 0; i < exprList.length; i++) {
        const expr = exprList[i];
        exprList[i] = toReferencedItem(parser, expr, exprList.length > 1, isParenthesizedExpr);
    }
    // @ts-ignore: We actually filtered them out
    return exprList;
}
exports.toReferencedList = toReferencedList;
function toReferencedListOptional(parser, exprList, isParenthesizedExpr) {
    for (let i = 0; i < exprList.length; i++) {
        const expr = exprList[i];
        if (expr.type !== 'ArrayHole') {
            exprList[i] = toReferencedItem(parser, expr, exprList.length > 1, isParenthesizedExpr);
        }
    }
    // @ts-ignore: We actually filtered them out
    return exprList;
}
exports.toReferencedListOptional = toReferencedListOptional;
function toReferencedItem(parser, expr, multiple, isParenthesizedExpr) {
    if (expr.type !== 'AmbiguousFlowTypeCastExpression') {
        return expr;
    }
    if (parser.isSyntaxEnabled('ts')) {
        parser.addDiagnostic({
            loc: expr.loc,
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_TYPE_CAST_IN_TS,
        });
    }
    if (!parser.isParenthesized(expr) && (multiple || !isParenthesizedExpr)) {
        parser.addDiagnostic({
            loc: expr.loc,
            description: diagnostics_1.descriptions.JS_PARSER.TYPE_CAST_EXPECTED_PARENS,
        });
    }
    if (expr.optional) {
        parser.addDiagnostic({
            loc: expr.loc,
            description: diagnostics_1.descriptions.JS_PARSER.TYPE_CAST_CANNOT_BE_OPTIONAL,
        });
    }
    const { typeAnnotation, expression } = expr;
    if (typeAnnotation === undefined) {
        parser.addDiagnostic({
            loc: expr.loc,
            description: diagnostics_1.descriptions.JS_PARSER.TYPE_CAST_WITHOUT_ANNOTATION,
        });
        return expression;
    }
    if (expression.type === 'SpreadElement') {
        throw new Error("I don't think a SpreadElement is ever allowed to hit this path?");
    }
    const node = {
        type: 'FlowTypeCastExpression',
        loc: expr.loc,
        typeAnnotation,
        expression,
    };
    return node;
}
exports.toReferencedItem = toReferencedItem;
function filterSpread(parser, elems) {
    for (let i = 0; i < elems.length; i++) {
        const elem = elems[i];
        if (elem.type === 'SpreadElement') {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.UNEXPECTED_SPREAD,
            });
            elems[i] = expression_1.toReferenceIdentifier(parser, parser.createUnknownIdentifier('spread substitute'));
        }
    }
    // @ts-ignore Technically wrong but we removed all SpreadElement
    return elems;
}
exports.filterSpread = filterSpread;
function toReferencedListDeep(parser, exprList, isParenthesizedExpr) {
    const refList = toReferencedList(parser, exprList, isParenthesizedExpr);
    toReferencedListDeepItems(parser, refList);
    return refList;
}
exports.toReferencedListDeep = toReferencedListDeep;
function toReferencedListDeepOptional(parser, exprList, isParenthesizedExpr) {
    const refList = toReferencedListOptional(parser, exprList, isParenthesizedExpr);
    toReferencedListDeepItems(parser, refList);
    return refList;
}
exports.toReferencedListDeepOptional = toReferencedListDeepOptional;
function toReferencedListDeepItems(parser, exprList) {
    for (let i = 0; i < exprList.length; i++) {
        const expr = exprList[i];
        if (expr.type === 'ArrayExpression') {
            toReferencedListDeepOptional(parser, expr.elements);
        }
    }
}
function parseSpread(parser, refShorthandDefaultPos, refNeedsArrowPos) {
    const start = parser.getPosition();
    parser.next();
    const argument = index_1.parseMaybeAssign(parser, 'spread argument', false, refShorthandDefaultPos, undefined, refNeedsArrowPos);
    if (ob1_1.ob1Get0(parser.state.commaAfterSpreadAt) === -1 && parser.match(types_1.types.comma)) {
        parser.state.commaAfterSpreadAt = parser.state.index;
    }
    return parser.finishNode(start, {
        type: 'SpreadElement',
        argument,
    });
}
exports.parseSpread = parseSpread;
// Parses lvalue (assignable) atom.
function parseTargetBindingPattern(parser) {
    switch (parser.state.tokenType) {
        case types_1.types.bracketL:
            return parseArrayPattern(parser);
        case types_1.types.braceL:
            return index_1.parseObjectPattern(parser, js_parser_utils_1.createIndexTracker());
    }
    return expression_1.parseBindingIdentifier(parser);
}
exports.parseTargetBindingPattern = parseTargetBindingPattern;
function parseArrayPattern(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'array pattern');
    const { list: elements, rest } = parseBindingList(parser, openContext, true);
    return parser.finishNode(start, {
        type: 'BindingArrayPattern',
        elements,
        rest,
    });
}
function parseBindingList(parser, openContext, allowHoles = false, allowTSModifiers = false) {
    const elts = [];
    let rest;
    let first = true;
    while (true) {
        if (parser.match(openContext.close) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (first) {
            first = false;
        }
        else {
            if (!parser.eat(types_1.types.comma)) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_COMMA_SEPARATOR(openContext.name),
                });
                break;
            }
        }
        if (allowHoles && parser.match(types_1.types.comma)) {
            elts.push(expression_1.parseArrayHole(parser));
        }
        else if (parser.match(openContext.close)) {
            parser.expectClosing(openContext);
            break;
        }
        else if (parser.match(types_1.types.ellipsis)) {
            parser.next();
            rest = parseBindingListItemTypes(parser, parser.getPosition(), parseTargetBindingPattern(parser));
            if (!hasCommaAfterRest(parser)) {
                parser.expectClosing(openContext);
                break;
            }
        }
        else {
            elts.push(parseBindingListItem(parser, allowTSModifiers));
        }
    }
    return { list: elts, rest };
}
exports.parseBindingList = parseBindingList;
function parseBindingListNonEmpty(parser, openContext, allowTSModifiers) {
    const list = parseBindingList(parser, openContext, false, allowTSModifiers);
    // @ts-ignore: Need to make this more explicit we set `allowEmpty: false` above
    return list;
}
exports.parseBindingListNonEmpty = parseBindingListNonEmpty;
function parseBindingListItem(parser, allowTSModifiers) {
    const start = parser.getPosition();
    let accessibility;
    let readonly = false;
    if (allowTSModifiers) {
        accessibility = index_1.parseTSAccessModifier(parser);
        readonly = index_1.hasTSModifier(parser, ['readonly']);
    }
    const left = parseBindingListItemTypes(parser, start, parseTargetBindingPattern(parser));
    const elt = parseMaybeDefault(parser, start, left);
    if (accessibility !== undefined || readonly) {
        if (!parser.isSyntaxEnabled('ts')) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.TS_DISABLED_BUT_ACCESSIBILITY_OR_READONLY,
            });
        }
        if (elt.type !== 'BindingIdentifier' &&
            elt.type !== 'BindingAssignmentPattern') {
            parser.addDiagnostic({
                start,
                description: diagnostics_1.descriptions.JS_PARSER.TS_PARAMETER_PROPERTY_BINDING_PATTERN,
            });
        }
        return parser.finishNode(start, {
            ...elt,
            meta: parser.finishNode(start, {
                type: 'PatternMeta',
                accessibility,
                readonly,
            }),
        });
    }
    return elt;
}
exports.parseBindingListItem = parseBindingListItem;
function parseBindingListItemTypes(parser, start, param) {
    let typeAnnotation;
    let optional;
    if (parser.eat(types_1.types.question)) {
        if (param.type !== 'BindingIdentifier') {
            parser.addDiagnostic({
                loc: param.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TYPE_BINDING_PARAMETER_OPTIONAL,
            });
        }
        optional = true;
    }
    if (parser.match(types_1.types.colon)) {
        typeAnnotation = index_1.parsePrimaryTypeAnnotation(parser);
    }
    return parser.finalizeNode({
        ...param,
        meta: parser.finishNode(start, {
            type: 'PatternMeta',
            optional,
            typeAnnotation,
        }),
    });
}
exports.parseBindingListItemTypes = parseBindingListItemTypes;
// Parses assignment pattern around given atom if possible.
function parseMaybeDefault(parser, start = parser.getPosition(), left = parseTargetBindingPattern(parser)) {
    let target;
    if (parser.eat(types_1.types.eq)) {
        const right = index_1.parseMaybeAssign(parser, 'assignment pattern right');
        const assign = parser.finishNode(start, {
            type: 'BindingAssignmentPattern',
            left,
            right,
        });
        target = assign;
    }
    else {
        target = left;
    }
    if (target.type === 'BindingAssignmentPattern' &&
        target.meta !== undefined &&
        target.meta.typeAnnotation !== undefined &&
        parser.getLoc(target.right).start.index <
            parser.getLoc(target.meta.typeAnnotation).start.index) {
        parser.addDiagnostic({
            loc: target.meta.typeAnnotation.loc,
            description: diagnostics_1.descriptions.JS_PARSER.TYPE_ANNOTATION_AFTER_ASSIGNMENT,
        });
    }
    return target;
}
exports.parseMaybeDefault = parseMaybeDefault;
const ALLOWED_PARENTHESIZED_LVAL_TYPES = [
    'Identifier',
    'MemberExpression',
    'TSAsExpression',
    'TSTypeAssertion',
    'TSAssignmentTypeAssertion',
    'TSAssignmentAsExpression',
    'TSAssignmentNonNullExpression',
];
// Verify that a node is an lval — something that can be assigned
// to.
function checkLVal(parser, expr, maybeIsBinding, checkClashes, contextDescription) {
    const isBinding = maybeIsBinding === undefined ? false : maybeIsBinding;
    // Verify that nodes aren't parenthesized
    if (parser.isParenthesized(expr) &&
        !ALLOWED_PARENTHESIZED_LVAL_TYPES.includes(expr.type)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_PARENTEHSIZED_LVAL(expr.type === 'BindingObjectPattern'
                ? 'object'
                : expr.type === 'BindingArrayPattern'
                    ? 'array'
                    : undefined),
            loc: expr.loc,
        });
    }
    switch (expr.type) {
        case 'FlowTypeCastExpression':
            // Allow 'typecasts' to appear on the left of assignment expressions,
            // because it may be in an arrow function.
            // e.g. `const f = (foo: number = 0) => foo;`
            // This will be validated later
            return undefined;
        case 'TSAsExpression':
        case 'TSNonNullExpression':
        case 'TSTypeAssertion': {
            checkLVal(parser, expr.expression, isBinding, checkClashes, contextDescription);
            return undefined;
        }
        case 'BindingIdentifier':
        case 'ReferenceIdentifier':
        case 'AssignmentIdentifier': {
            if (parser.inScope('STRICT') &&
                js_parser_utils_1.isStrictBindReservedWord(expr.name, parser.inModule)) {
                parser.addDiagnostic({
                    loc: expr.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.RESERVED_WORD(expr.name),
                });
            }
            if (checkClashes !== undefined) {
                const clash = checkClashes.get(expr.name);
                if (clash === undefined) {
                    checkClashes.set(expr.name, expr);
                }
                else {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.ARGUMENT_CLASH_IN_STRICT(expr.name, expr.loc),
                        loc: expr.loc,
                    });
                }
            }
            break;
        }
        case 'AssignmentObjectPattern':
        case 'BindingObjectPattern': {
            if (expr.rest !== undefined) {
                checkLVal(parser, expr.rest, isBinding, checkClashes, 'rest property');
            }
            for (let prop of expr.properties) {
                if (prop.type === 'BindingObjectPatternProperty') {
                    checkLVal(parser, prop.value, isBinding, checkClashes, 'object destructuring pattern');
                }
                else {
                    checkLVal(parser, prop, isBinding, checkClashes, 'object destructuring pattern');
                }
            }
            break;
        }
        case 'AssignmentObjectPatternProperty':
        case 'BindingObjectPatternProperty':
            break;
        case 'AssignmentArrayPattern':
        case 'BindingArrayPattern': {
            if (expr.rest !== undefined) {
                checkLVal(parser, expr.rest, isBinding, checkClashes, 'rest element');
            }
            for (const elem of expr.elements) {
                checkLVal(parser, elem, isBinding, checkClashes, 'array destructuring pattern');
            }
            break;
        }
        case 'BindingAssignmentPattern': {
            checkLVal(parser, expr.left, isBinding, checkClashes, 'assignment pattern');
            break;
        }
    }
}
exports.checkLVal = checkLVal;
function checkToRestConversion(parser, node) {
    if (VALID_REST_ARGUMENT_TYPES.includes(node.argument.type) === false) {
        parser.addDiagnostic({
            loc: node.argument.loc,
            description: diagnostics_1.descriptions.JS_PARSER.REST_INVALID_ARGUMENT,
        });
    }
}
exports.checkToRestConversion = checkToRestConversion;
function hasCommaAfterRest(parser) {
    if (parser.match(types_1.types.comma)) {
        raiseRestNotLast(parser);
        return true;
    }
    return false;
}
exports.hasCommaAfterRest = hasCommaAfterRest;
function raiseRestNotLast(parser, loc, start) {
    parser.addDiagnostic({
        start,
        loc,
        description: diagnostics_1.descriptions.JS_PARSER.DESTRUCTURING_REST_ELEMENT_NOT_LAST,
    });
}
exports.raiseRestNotLast = raiseRestNotLast;
function checkCommaAfterRestFromSpread(parser) {
    if (ob1_1.ob1Get0(parser.state.commaAfterSpreadAt) > -1) {
        raiseRestNotLast(parser, undefined, parser.getPositionFromIndex(parser.state.commaAfterSpreadAt));
    }
}
exports.checkCommaAfterRestFromSpread = checkCommaAfterRestFromSpread;
