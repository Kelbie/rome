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
// Doesn't handle 'void' or 'null' because those are keywords, not identifiers.
function keywordTypeFromName(value) {
    switch (value) {
        case 'any':
            return 'AnyKeywordTypeAnnotation';
        case 'boolean':
            return 'BooleanKeywordTypeAnnotation';
        case 'bigint':
            return 'BigIntKeywordTypeAnnotation';
        case 'never':
            return 'NeverKeywordTypeAnnotation';
        case 'number':
            return 'NumberKeywordTypeAnnotation';
        case 'object':
            return 'ObjectKeywordTypeAnnotation';
        case 'string':
            return 'StringKeywordTypeAnnotation';
        case 'symbol':
            return 'SymbolKeywordTypeAnnotation';
        case 'undefined':
            return 'UndefinedKeywordTypeAnnotation';
        case 'unknown':
            return 'UnknownKeywordTypeAnnotation';
        default:
            return undefined;
    }
}
function tsIsIdentifier(parser) {
    // TODO: actually a bit more complex in TypeScript, but shouldn't matter.
    // See https://github.com/Microsoft/TypeScript/issues/15008
    return parser.match(types_1.types.name);
}
function tsNextTokenCanFollowModifier(parser) {
    // Note: TypeScript's implementation is much more complicated because
    // more things are considered modifiers there.
    // This implementation only handles modifiers not handled by @babel/parser itself. And 'static'.
    // TODO: Would be nice to avoid lookahead. Want a hasLineBreakUpNext() method...
    parser.next();
    return (!parser.hasPrecedingLineBreak() &&
        !parser.match(types_1.types.parenL) &&
        !parser.match(types_1.types.parenR) &&
        !parser.match(types_1.types.colon) &&
        !parser.match(types_1.types.eq) &&
        !parser.match(types_1.types.question) &&
        !parser.match(types_1.types.bang));
}
/** Parses a modifier matching one the given modifier names.*/
function parseTSModifier(parser, allowedModifiers) {
    if (!parser.match(types_1.types.name)) {
        return undefined;
    }
    // @ts-ignore: We are lying here but we validate it in all the correct places
    const modifier = String(parser.state.tokenValue);
    if (allowedModifiers.includes(modifier) &&
        tryTSParse(parser, tsNextTokenCanFollowModifier)) {
        return modifier;
    }
    else {
        return undefined;
    }
}
exports.parseTSModifier = parseTSModifier;
function hasTSModifier(parser, allowedModifiers) {
    return parseTSModifier(parser, allowedModifiers) !== undefined;
}
exports.hasTSModifier = hasTSModifier;
function tsIsListTerminator(parser, kind) {
    if (parser.match(types_1.types.eof)) {
        return true;
    }
    switch (kind) {
        case 'EnumMembers':
        case 'TypeMembers':
            return parser.match(types_1.types.braceR);
        case 'HeritageClauseElement':
            return parser.match(types_1.types.braceL);
        case 'TupleElementTypes':
            return parser.match(types_1.types.bracketR);
        case 'TypeParametersOrArguments':
            return parser.isRelational('>');
    }
    throw new Error('Unreachable');
}
function parseTSList(parser, kind, parseElement) {
    const result = [];
    while (!tsIsListTerminator(parser, kind)) {
        // Skipping 'parseListElement' from the TS source since that's just for error handling.
        result.push(parseElement(parser));
    }
    return result;
}
/**
 * If !expectSuccess, returns undefined instead of failing to parse.
 * If expectSuccess, parseElement should always return a defined value.
 */
function parseTSDelimitedList(parser, kind, parseElement) {
    const result = [];
    while (true) {
        if (tsIsListTerminator(parser, kind)) {
            break;
        }
        const element = parseElement(parser);
        if (element === undefined) {
            break;
        }
        result.push(element);
        if (parser.eat(types_1.types.comma)) {
            continue;
        }
        if (tsIsListTerminator(parser, kind)) {
            break;
        }
        // This will fail with an error about a missing comma
        if (parser.expect(types_1.types.comma)) {
            break;
        }
    }
    return result;
}
function parseTSBracketedList(parser, kind, parseElement, bracket, skipFirstToken) {
    if (!skipFirstToken) {
        if (bracket) {
            parser.expect(types_1.types.bracketL);
        }
        else {
            parser.expectRelational('<');
        }
    }
    const result = parseTSDelimitedList(parser, kind, parseElement);
    if (bracket) {
        parser.expect(types_1.types.bracketR);
    }
    else {
        parser.expectRelational('>');
    }
    return result;
}
function parseTSImportType(parser) {
    const start = parser.getPosition();
    parser.expect(types_1.types._import);
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'ts import type');
    if (!parser.match(types_1.types.string)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.TS_IMPORT_ARG_NOT_STRING,
        });
    }
    const argument = index_1.parseExpressionAtom(parser, 'ts import argument');
    parser.expectClosing(openContext);
    let qualifier;
    if (parser.eat(types_1.types.dot)) {
        qualifier = parseTSEntityName(parser, /* allowReservedWords */ true);
    }
    let typeParameters;
    if (parser.isRelational('<')) {
        typeParameters = parseTSTypeArguments(parser);
    }
    return parser.finishNode(start, {
        type: 'TSImportType',
        argument,
        qualifier,
        typeParameters,
    });
}
function parseTSEntityName(parser, allowReservedWords) {
    let entity = index_1.parseReferenceIdentifier(parser);
    while (parser.eat(types_1.types.dot)) {
        const start = parser.getLoc(entity).start;
        const right = index_1.parseIdentifier(parser, allowReservedWords);
        entity = parser.finishNode(start, {
            type: 'TSQualifiedName',
            left: entity,
            right,
        });
    }
    return entity;
}
function parseTSTypeReference(parser) {
    const start = parser.getPosition();
    const typeName = parseTSEntityName(parser, /* allowReservedWords */ false);
    let typeParameters;
    if (!parser.hasPrecedingLineBreak() && parser.isRelational('<')) {
        typeParameters = parseTSTypeArguments(parser);
    }
    return parser.finishNode(start, {
        type: 'TSTypeReference',
        typeName,
        typeParameters,
    });
}
function parseTSThisTypePredicate(parser, lhs) {
    parser.next();
    const start = parser.getLoc(lhs).start;
    const parameterName = lhs;
    const typeAnnotation = parseTSTypeAnnotation(parser, /* eatColon */ false);
    return parser.finishNode(start, {
        type: 'TSTypePredicate',
        asserts: false,
        parameterName,
        typeAnnotation,
    });
}
function parseTSThisTypeNode(parser) {
    const start = parser.getPosition();
    parser.next();
    return parser.finishNode(start, {
        type: 'TSThisType',
    });
}
function parseTSTypeQuery(parser) {
    const start = parser.getPosition();
    parser.expect(types_1.types._typeof);
    let exprName;
    if (parser.match(types_1.types._import)) {
        exprName = parseTSImportType(parser);
    }
    else {
        exprName = parseTSEntityName(parser, /* allowReservedWords */ true);
    }
    return parser.finishNode(start, {
        type: 'TSTypeQuery',
        exprName,
    });
}
function parseTSTypeParameter(parser) {
    const start = parser.getPosition();
    const name = index_1.parseIdentifierName(parser);
    const constraint = tsEatThenParseType(parser, types_1.types._extends);
    const _default = tsEatThenParseType(parser, types_1.types.eq);
    return parser.finishNode(start, {
        type: 'TSTypeParameter',
        name,
        constraint,
        default: _default,
    });
}
function tryParseTSTypeParameters(parser) {
    if (parser.isRelational('<')) {
        return parseTSTypeParameters(parser);
    }
    else {
        return undefined;
    }
}
function parseTSTypeParameters(parser) {
    const start = parser.getPosition();
    parser.expectRelational('<');
    const params = parseTSBracketedList(parser, 'TypeParametersOrArguments', parseTSTypeParameter, 
    /* bracket */ false, 
    /* skipFirstToken */ true);
    return parser.finishNode(start, {
        type: 'TSTypeParameterDeclaration',
        params,
    });
}
exports.parseTSTypeParameters = parseTSTypeParameters;
function tryTSNextParseConstantContext(parser) {
    if (parser.lookaheadState().tokenType === types_1.types._const) {
        parser.next();
        return parseTSTypeReference(parser);
    }
    else {
        return undefined;
    }
}
exports.tryTSNextParseConstantContext = tryTSNextParseConstantContext;
function tsCheckLiteralForConstantContext(parser, node) {
    switch (node.type) {
        case 'StringLiteral':
        case 'TemplateLiteral':
        case 'NumericLiteral':
        case 'BooleanLiteral':
        case 'SpreadElement':
        case 'ObjectMethod':
        case 'ObjectExpression':
            break;
        case 'ArrayExpression': {
            for (const elem of node.elements) {
                if (elem) {
                    tsCheckLiteralForConstantContext(parser, elem);
                }
            }
            break;
        }
        case 'ObjectProperty': {
            tsCheckLiteralForConstantContext(parser, node.value);
            break;
        }
        case 'UnaryExpression': {
            tsCheckLiteralForConstantContext(parser, node.argument);
            break;
        }
        default:
            parser.addDiagnostic({
                loc: node.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TS_CONSTANT_NOT_LITERAL,
            });
    }
}
exports.tsCheckLiteralForConstantContext = tsCheckLiteralForConstantContext;
// Note: In TypeScript implementation we must provide `yieldContext` and `awaitContext`,
// but here it's always false, because parser.is only used for types.
function parseTSSignatureDeclarationMeta(parser, returnToken) {
    const start = parser.getPosition();
    // Arrow fns *must* have return token (`=>`). Normal functions can omit it.
    const returnTokenRequired = returnToken === types_1.types.arrow;
    const typeParameters = tryParseTSTypeParameters(parser);
    const { list: parameters, rest } = parseTSBindingListForSignature(parser);
    let typeAnnotation;
    if (returnTokenRequired) {
        typeAnnotation = parseTSTypeOrTypePredicateAnnotation(parser, returnToken);
    }
    else if (parser.match(returnToken)) {
        typeAnnotation = parseTSTypeOrTypePredicateAnnotation(parser, returnToken);
    }
    return {
        typeAnnotation,
        meta: parser.finishNode(start, {
            type: 'TSSignatureDeclarationMeta',
            typeParameters,
            parameters,
            rest,
        }),
    };
}
function parseTSBindingListForSignature(parser) {
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'ts signature parameters');
    const { list: patterns, rest } = index_1.parseBindingListNonEmpty(parser, openContext);
    const validPatterns = [];
    for (const pattern of patterns) {
        if (pattern.type === 'BindingIdentifier' ||
            pattern.type === 'BindingObjectPattern' ||
            pattern.type === 'BindingArrayPattern') {
            validPatterns.push(pattern);
        }
        else {
            parser.addDiagnostic({
                loc: pattern.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TS_INVALID_SIGNATURE_BINDING_NODE,
            });
        }
    }
    return { list: validPatterns, rest };
}
function parseTSTypeMemberSemicolon(parser) {
    if (!parser.eat(types_1.types.comma)) {
        parser.semicolon();
    }
}
function parseTSConstructSignatureDeclaration(parser) {
    const start = parser.getPosition();
    parser.expect(types_1.types._new);
    const { meta, typeAnnotation } = parseTSSignatureDeclarationMeta(parser, types_1.types.colon);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TSConstructSignatureDeclaration',
        meta,
        typeAnnotation,
    });
}
function parseTSCallSignatureDeclaration(parser) {
    const start = parser.getPosition();
    const { meta, typeAnnotation } = parseTSSignatureDeclarationMeta(parser, types_1.types.colon);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TSCallSignatureDeclaration',
        meta,
        typeAnnotation,
    });
}
function tsIsUnambiguouslyIndexSignature(parser) {
    parser.next(); // Skip '{'
    return parser.eat(types_1.types.name) && parser.match(types_1.types.colon);
}
function tryTSParseIndexSignature(parser, start) {
    if (!(parser.match(types_1.types.bracketL) &&
        lookaheadTS(parser, tsIsUnambiguouslyIndexSignature))) {
        return undefined;
    }
    parser.expect(types_1.types.bracketL);
    const idStart = parser.getPosition();
    const id = index_1.parseBindingIdentifier(parser);
    const keyTypeAnnotation = parseTSTypeAnnotation(parser);
    const key = parser.finishNode(idStart, {
        ...id,
        meta: parser.finishNode(idStart, {
            ...id.meta,
            type: 'PatternMeta',
            typeAnnotation: keyTypeAnnotation,
        }),
    });
    parser.expect(types_1.types.bracketR);
    const typeAnnotation = tryTSParseTypeAnnotation(parser);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TSIndexSignature',
        typeAnnotation,
        key,
    });
}
exports.tryTSParseIndexSignature = tryTSParseIndexSignature;
function parseTSPropertyOrMethodSignature(parser, start, readonly) {
    const key = index_1.parseObjectPropertyKey(parser);
    const optional = parser.eat(types_1.types.question);
    if (!readonly && (parser.match(types_1.types.parenL) || parser.isRelational('<'))) {
        const { meta, typeAnnotation } = parseTSSignatureDeclarationMeta(parser, types_1.types.colon);
        parseTSTypeMemberSemicolon(parser);
        return parser.finishNode(start, {
            type: 'TSMethodSignature',
            optional,
            meta,
            key,
            returnType: typeAnnotation,
        });
    }
    else {
        const typeAnnotation = tryTSParseTypeAnnotation(parser);
        parseTSTypeMemberSemicolon(parser);
        return parser.finishNode(start, {
            type: 'TSPropertySignature',
            optional,
            readonly,
            typeAnnotation,
            key,
        });
    }
}
function parseTSTypeMember(parser) {
    if (parser.match(types_1.types.parenL) || parser.isRelational('<')) {
        return parseTSCallSignatureDeclaration(parser);
    }
    if (parser.match(types_1.types._new) &&
        lookaheadTS(parser, tsIsStartOfConstructSignature)) {
        return parseTSConstructSignatureDeclaration(parser);
    }
    const start = parser.getPosition();
    const readonly = hasTSModifier(parser, ['readonly']);
    const idx = tryTSParseIndexSignature(parser, start);
    if (idx) {
        return {
            ...idx,
            readonly,
        };
    }
    return parseTSPropertyOrMethodSignature(parser, start, readonly);
}
function tsIsStartOfConstructSignature(parser) {
    parser.next();
    return parser.match(types_1.types.parenL) || parser.isRelational('<');
}
function parseTSTypeLiteral(parser) {
    const start = parser.getPosition();
    const members = parseTSObjectTypeMembers(parser);
    return parser.finishNode(start, {
        type: 'TSTypeLiteral',
        members,
    });
}
function parseTSObjectTypeMembers(parser) {
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'ts object type members');
    const members = parseTSList(parser, 'TypeMembers', parseTSTypeMember);
    parser.expectClosing(openContext);
    return members;
}
function tsIsStartOfMappedType(parser) {
    parser.next();
    if (parser.eat(types_1.types.plusMin)) {
        return parser.isContextual('readonly');
    }
    if (parser.isContextual('readonly')) {
        parser.next();
    }
    if (!parser.match(types_1.types.bracketL)) {
        return false;
    }
    parser.next();
    if (!tsIsIdentifier(parser)) {
        return false;
    }
    parser.next();
    return parser.match(types_1.types._in);
}
function parseTSMappedTypeParameter(parser) {
    const start = parser.getPosition();
    const name = index_1.parseIdentifierName(parser);
    const constraint = tsExpectThenParseType(parser, types_1.types._in);
    return parser.finishNode(start, {
        type: 'TSTypeParameter',
        name,
        constraint,
    });
}
function toPlusMin(val) {
    const str = String(val);
    if (str === '+' || str === '-') {
        return str;
    }
    else {
        throw new Error('Expected +/-');
    }
}
function parseTSMappedType(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'ts mapped type');
    let readonly;
    if (parser.match(types_1.types.plusMin)) {
        readonly = toPlusMin(parser.state.tokenValue);
        parser.next();
        parser.expectContextual('readonly');
    }
    else if (parser.eatContextual('readonly')) {
        readonly = true;
    }
    const paramOpenContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'ts mapped type parameter');
    const typeParameter = parseTSMappedTypeParameter(parser);
    parser.expectClosing(paramOpenContext);
    let optional;
    if (parser.match(types_1.types.plusMin)) {
        optional = toPlusMin(parser.state.tokenValue);
        parser.next();
        parser.expect(types_1.types.question);
    }
    else if (parser.eat(types_1.types.question)) {
        optional = true;
    }
    const typeAnnotation = tryTSParseType(parser);
    parser.semicolon();
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'TSMappedType',
        typeParameter,
        typeAnnotation,
        optional,
        readonly,
    });
}
function parseTSTupleType(parser) {
    const start = parser.getPosition();
    const elementDefs = parseTSBracketedList(parser, 'TupleElementTypes', parseTSTupleElementType, 
    /* bracket */ true, 
    /* skipFirstToken */ false);
    // Validate the elementTypes to ensure:
    //   No mandatory elements may follow optional elements
    //   If there's a rest element, it must be at the end of the tuple
    let seenOptionalElement = false;
    const elementTypes = [];
    let rest;
    for (const { type, isRest } of elementDefs) {
        if (rest !== undefined) {
            // No elements should come after a rest, we should have already produced an error
            continue;
        }
        if (type.type === 'TSOptionalType') {
            seenOptionalElement = true;
        }
        else if (seenOptionalElement && !isRest) {
            parser.addDiagnostic({
                loc: type.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TS_REQUIRED_FOLLOWS_OPTIONAL,
            });
        }
        if (isRest) {
            rest = type;
        }
        else {
            elementTypes.push(type);
        }
    }
    return parser.finishNode(start, {
        type: 'TSTupleType',
        elementTypes,
        rest,
    });
}
function parseTSTupleElementType(parser) {
    // parses `...TsType[]`
    if (parser.match(types_1.types.ellipsis)) {
        parser.next(); // skips ellipsis
        const typeAnnotation = parseTSType(parser);
        index_1.hasCommaAfterRest(parser);
        return {
            isRest: true,
            type: typeAnnotation,
        };
    }
    const typeAnnotation = parseTSType(parser);
    // Parses `TsType?`
    if (parser.eat(types_1.types.question)) {
        const start = parser.getLoc(typeAnnotation).start;
        return {
            isRest: false,
            type: parser.finishNode(start, {
                type: 'TSOptionalType',
                typeAnnotation,
            }),
        };
    }
    return {
        isRest: false,
        type: typeAnnotation,
    };
}
function parseTSParenthesizedType(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'ts parenthesized type');
    const typeAnnotation = parseTSType(parser);
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'TSParenthesizedType',
        typeAnnotation,
    });
}
function parseTSFunctionType(parser) {
    const start = parser.getPosition();
    const { meta, typeAnnotation } = parseTSSignatureDeclarationMeta(parser, types_1.types.arrow);
    if (typeAnnotation === undefined) {
        throw new Error('Type annotation return type required as we passed tt.arrow above');
    }
    return parser.finishNode(start, {
        type: 'TSFunctionType',
        meta,
        typeAnnotation,
    });
}
function parseTSConstructorType(parser) {
    const start = parser.getPosition();
    parser.expect(types_1.types._new);
    const { meta, typeAnnotation } = parseTSSignatureDeclarationMeta(parser, types_1.types.arrow);
    if (typeAnnotation === undefined) {
        throw new Error('Type annotation return type required as we passed tt.arrow above');
    }
    return parser.finishNode(start, {
        type: 'TSConstructorType',
        meta,
        typeAnnotation,
    });
}
function parseTSTemplateLiteralType(parser) {
    const templateNode = index_1.parseTemplate(parser, false);
    if (templateNode.expressions.length > 0) {
        parser.addDiagnostic({
            loc: parser.getLoc(templateNode.expressions[0]),
            description: diagnostics_1.descriptions.JS_PARSER.TS_TEMPLATE_LITERAL_WITH_SUBSTITUION,
        });
    }
    return {
        type: 'TemplateLiteralTypeAnnotation',
        value: templateNode.quasis[0].raw,
        loc: templateNode.loc,
    };
}
function parseTSNonArrayType(parser) {
    switch (parser.state.tokenType) {
        case types_1.types.name:
        case types_1.types._void:
        case types_1.types._null: {
            let type;
            if (parser.match(types_1.types._void)) {
                type = 'VoidKeywordTypeAnnotation';
            }
            else if (parser.match(types_1.types._null)) {
                type = 'NullKeywordTypeAnnotation';
            }
            else {
                type = keywordTypeFromName(String(parser.state.tokenValue));
            }
            if (type !== undefined && parser.lookaheadState().tokenType !== types_1.types.dot) {
                const start = parser.getPosition();
                parser.next();
                return parser.finishNode(start, {
                    type,
                });
            }
            return parseTSTypeReference(parser);
        }
        case types_1.types.string:
        case types_1.types.num:
        case types_1.types._true:
        case types_1.types._false:
        case types_1.types.plusMin:
            return index_1.parseTypeLiteralAnnotation(parser);
        case types_1.types._this: {
            const thisKeyword = parseTSThisTypeNode(parser);
            if (parser.isContextual('is') && !parser.hasPrecedingLineBreak()) {
                return parseTSThisTypePredicate(parser, thisKeyword);
            }
            else {
                return thisKeyword;
            }
        }
        case types_1.types._typeof:
            return parseTSTypeQuery(parser);
        case types_1.types._import:
            return parseTSImportType(parser);
        case types_1.types.braceL:
            if (lookaheadTS(parser, tsIsStartOfMappedType)) {
                return parseTSMappedType(parser);
            }
            else {
                return parseTSTypeLiteral(parser);
            }
        case types_1.types.bracketL:
            return parseTSTupleType(parser);
        case types_1.types.parenL:
            return parseTSParenthesizedType(parser);
        case types_1.types.backQuote:
            return parseTSTemplateLiteralType(parser);
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.TS_UNKNOWN_NON_ARRAY_START,
    });
    parser.next();
    return parser.finishNode(parser.getPosition(), {
        type: 'TSTypeReference',
        typeName: index_1.toReferenceIdentifier(parser, parser.createUnknownIdentifier('ts non array type start')),
    });
}
function parseTSArrayTypeOrHigher(parser) {
    let type = parseTSNonArrayType(parser);
    while (!parser.hasPrecedingLineBreak() && parser.eat(types_1.types.bracketL)) {
        if (parser.match(types_1.types.bracketR)) {
            const start = parser.getLoc(type).start;
            const elementType = type;
            parser.expect(types_1.types.bracketR);
            type = parser.finishNode(start, {
                type: 'TSArrayType',
                elementType,
            });
        }
        else {
            const start = parser.getLoc(type).start;
            const objectType = type;
            const indexType = parseTSType(parser);
            parser.expect(types_1.types.bracketR);
            type = parser.finishNode(start, {
                type: 'TSIndexedAccessType',
                objectType,
                indexType,
            });
        }
    }
    return type;
}
function parseTSTypeOperator(parser, operator) {
    const start = parser.getPosition();
    parser.expectContextual(operator);
    const typeAnnotation = parseTSTypeOperatorOrHigher(parser);
    const node = parser.finishNode(start, {
        type: 'TSTypeOperator',
        typeAnnotation,
        operator,
    });
    if (operator === 'readonly') {
        tsCheckTypeAnnotationForReadOnly(parser, typeAnnotation);
    }
    return node;
}
function tsCheckTypeAnnotationForReadOnly(parser, node) {
    switch (node.type) {
        case 'TSTupleType':
        case 'TSArrayType':
            return;
        default: {
            parser.addDiagnostic({
                loc: node.loc,
                description: diagnostics_1.descriptions.JS_PARSER.TS_INVALID_READONLY_MODIFIER,
            });
            break;
        }
    }
}
function parseTSInferType(parser) {
    const inferStart = parser.getPosition();
    parser.expectContextual('infer');
    const start = parser.getPosition();
    const name = index_1.parseIdentifierName(parser);
    const typeParameter = parser.finishNode(start, {
        type: 'TSTypeParameter',
        name,
    });
    return parser.finishNode(inferStart, {
        type: 'TSInferType',
        typeParameter,
    });
}
const TS_TYPE_OPERATORS = [
    'keyof',
    'unique',
    'readonly',
];
function parseTSTypeOperatorOrHigher(parser) {
    let operator;
    for (const op of TS_TYPE_OPERATORS) {
        if (parser.isContextual(op)) {
            operator = op;
            break;
        }
    }
    if (operator !== undefined) {
        return parseTSTypeOperator(parser, operator);
    }
    else if (parser.isContextual('infer')) {
        return parseTSInferType(parser);
    }
    else {
        return parseTSArrayTypeOrHigher(parser);
    }
}
function parseTSUnionOrIntersectionType(parser, kind, parseConstituentType, operator) {
    parser.eat(operator);
    let type = parseConstituentType(parser);
    if (parser.match(operator)) {
        const types = [type];
        while (parser.eat(operator)) {
            types.push(parseConstituentType(parser));
        }
        const start = parser.getLoc(type).start;
        if (kind === 'UnionTypeAnnotation') {
            type = parser.finishNode(start, {
                type: 'UnionTypeAnnotation',
                types,
            });
        }
        else if (kind === 'IntersectionTypeAnnotation') {
            type = parser.finishNode(start, {
                type: 'IntersectionTypeAnnotation',
                types,
            });
        }
    }
    return type;
}
function parseIntersectionTypeAnnotationOrHigher(parser) {
    return parseTSUnionOrIntersectionType(parser, 'IntersectionTypeAnnotation', parseTSTypeOperatorOrHigher, types_1.types.bitwiseAND);
}
function parseUnionTypeAnnotationOrHigher(parser) {
    return parseTSUnionOrIntersectionType(parser, 'UnionTypeAnnotation', parseIntersectionTypeAnnotationOrHigher, types_1.types.bitwiseOR);
}
function tsIsStartOfFunctionType(parser) {
    if (parser.isRelational('<')) {
        return true;
    }
    return (parser.match(types_1.types.parenL) &&
        lookaheadTS(parser, tsIsUnambiguouslyStartOfFunctionType));
}
function tsSkipParameterStart(parser) {
    if (parser.match(types_1.types.name) || parser.match(types_1.types._this)) {
        parser.next();
        return true;
    }
    if (parser.match(types_1.types.braceL)) {
        let braceStackCounter = 1;
        parser.next();
        while (braceStackCounter > 0) {
            if (parser.match(types_1.types.braceL)) {
                braceStackCounter++;
            }
            else if (parser.match(types_1.types.braceR)) {
                braceStackCounter--;
            }
            parser.next();
        }
        return true;
    }
    if (parser.match(types_1.types.bracketL)) {
        let braceStackCounter = 1;
        parser.next();
        while (braceStackCounter > 0) {
            if (parser.match(types_1.types.bracketL)) {
                braceStackCounter++;
            }
            else if (parser.match(types_1.types.bracketR)) {
                braceStackCounter--;
            }
            parser.next();
        }
        return true;
    }
    return false;
}
function tsIsUnambiguouslyStartOfFunctionType(parser) {
    parser.next();
    if (parser.match(types_1.types.parenR) || parser.match(types_1.types.ellipsis)) {
        // ()
        // (...
        return true;
    }
    if (tsSkipParameterStart(parser)) {
        if (parser.match(types_1.types.colon) ||
            parser.match(types_1.types.comma) ||
            parser.match(types_1.types.question) ||
            parser.match(types_1.types.eq)) {
            // (xxx :
            // (xxx ,
            // (xxx ?
            // (xxx =
            return true;
        }
        if (parser.match(types_1.types.parenR)) {
            parser.next();
            if (parser.match(types_1.types.arrow)) {
                // (xxx ) =>
                return true;
            }
        }
    }
    return false;
}
function parseTSTypeOrTypePredicateAnnotation(parser, returnToken) {
    let start = parser.getPosition();
    parser.pushScope('TYPE', true);
    parser.expect(returnToken);
    let hasAsserts = parser.eatContextual('asserts');
    let parameterName;
    let typePredicateVariable;
    if (tsIsIdentifier(parser)) {
        typePredicateVariable = tryTSParse(parser, parseTSTypePredicatePrefix);
    }
    if (typePredicateVariable === undefined) {
        if (hasAsserts) {
            parameterName = index_1.parseIdentifier(parser);
            if (parameterName === undefined) {
                throw Error('Should have an identifier after asserts');
            }
        }
        else {
            parser.popScope('TYPE');
            return parseTSTypeAnnotation(parser, /* eatColon */ false, start);
        }
    }
    else {
        parameterName = typePredicateVariable;
    }
    let type;
    if (typePredicateVariable) {
        type = parseTSTypeAnnotation(parser, /* eatColon */ false);
        start = parser.getLoc(typePredicateVariable).start;
    }
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'TSTypePredicate',
        asserts: hasAsserts,
        parameterName,
        typeAnnotation: type,
    });
}
exports.parseTSTypeOrTypePredicateAnnotation = parseTSTypeOrTypePredicateAnnotation;
function tryTSParseTypeAnnotation(parser) {
    return parser.match(types_1.types.colon) ? parseTSTypeAnnotation(parser) : undefined;
}
function tryTSParseType(parser) {
    return tsEatThenParseType(parser, types_1.types.colon);
}
function parseTSTypePredicatePrefix(parser) {
    const id = index_1.parseIdentifier(parser);
    if (parser.isContextual('is') && !parser.hasPrecedingLineBreak()) {
        parser.next();
        return id;
    }
    else {
        return undefined;
    }
}
function parseTSTypeAnnotation(parser, eatColon = true, start = parser.getPosition()) {
    parser.pushScope('TYPE', true);
    if (eatColon) {
        parser.expect(types_1.types.colon);
    }
    const typeAnnotation = parseTSType(parser, start);
    parser.popScope('TYPE');
    return typeAnnotation;
}
exports.parseTSTypeAnnotation = parseTSTypeAnnotation;
/** Be sure to be in a type context before calling parser. using `tsInType`.*/
function parseTSType(parser, start = parser.getPosition()) {
    parser.pushScope('TYPE', true);
    const type = parseTSNonConditionalType(parser);
    if (parser.hasPrecedingLineBreak() || !parser.eat(types_1.types._extends)) {
        parser.popScope('TYPE');
        return type;
    }
    const checkType = type;
    const extendsType = parseTSNonConditionalType(parser);
    parser.expect(types_1.types.question);
    const trueType = parseTSType(parser);
    parser.expect(types_1.types.colon);
    const falseType = parseTSType(parser);
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'TSConditionalType',
        checkType,
        extendsType,
        trueType,
        falseType,
    });
}
function parseTSNonConditionalType(parser) {
    if (tsIsStartOfFunctionType(parser)) {
        return parseTSFunctionType(parser);
    }
    if (parser.match(types_1.types._new)) {
        // As in `new () => Date`
        return parseTSConstructorType(parser);
    }
    return parseUnionTypeAnnotationOrHigher(parser);
}
function parseTSTypeAssertion(parser) {
    const start = parser.getPosition();
    const _const = tryTSNextParseConstantContext(parser);
    const typeAnnotation = _const || tsNextThenParseType(parser);
    parser.expectRelational('>');
    const expression = index_1.parseMaybeUnary(parser, 'ts type assertion');
    if (_const) {
        tsCheckLiteralForConstantContext(parser, expression);
    }
    return parser.finishNode(start, {
        type: 'TSTypeAssertion',
        expression,
        typeAnnotation,
    });
}
exports.parseTSTypeAssertion = parseTSTypeAssertion;
function parseTSHeritageClause(parser, descriptor) {
    const originalStart = parser.state.startPos;
    const delimitedList = parseTSDelimitedList(parser, 'HeritageClauseElement', parseTSExpressionWithTypeArguments);
    if (delimitedList.length === 0) {
        parser.addDiagnostic({
            start: originalStart,
            description: diagnostics_1.descriptions.JS_PARSER.TS_EMPTY_LIST(descriptor),
        });
    }
    return delimitedList;
}
exports.parseTSHeritageClause = parseTSHeritageClause;
function parseTSExpressionWithTypeArguments(parser) {
    const start = parser.getPosition();
    // Note: TS uses parseLeftHandSideExpressionOrHigher,
    // then has grammar errors later if it's not an EntityName.
    const expression = parseTSEntityName(parser, /* allowReservedWords */ false);
    let typeParameters;
    if (parser.isRelational('<')) {
        typeParameters = parseTSTypeArguments(parser);
    }
    return parser.finishNode(start, {
        type: 'TSExpressionWithTypeArguments',
        expression,
        typeParameters,
    });
}
function parseTSInterfaceDeclaration(parser, start) {
    parser.pushScope('TYPE', true);
    const id = index_1.parseBindingIdentifier(parser);
    const typeParameters = tryParseTSTypeParameters(parser);
    let _extends;
    if (parser.eat(types_1.types._extends)) {
        _extends = parseTSHeritageClause(parser, 'extends');
    }
    const bodyStart = parser.getPosition();
    const bodyItems = parseTSObjectTypeMembers(parser);
    const body = parser.finishNode(bodyStart, {
        type: 'TSInterfaceBody',
        body: bodyItems,
    });
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'TSInterfaceDeclaration',
        id,
        body,
        typeParameters,
        extends: _extends,
    });
}
exports.parseTSInterfaceDeclaration = parseTSInterfaceDeclaration;
function parseTSTypeAliasTypeAnnotation(parser, start) {
    const id = index_1.parseBindingIdentifier(parser);
    const typeParameters = tryParseTSTypeParameters(parser);
    const typeAnnotation = tsExpectThenParseType(parser, types_1.types.eq);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TypeAliasTypeAnnotation',
        id,
        typeParameters,
        right: typeAnnotation,
    });
}
exports.parseTSTypeAliasTypeAnnotation = parseTSTypeAliasTypeAnnotation;
function tsInNoContext(parser, cb) {
    const oldContext = parser.state.context;
    parser.state.context = [oldContext[0]];
    const res = cb(parser);
    parser.state.context = oldContext;
    return res;
}
function tsEatThenParseType(parser, token) {
    if (parser.match(token)) {
        return tsNextThenParseType(parser);
    }
    else {
        return undefined;
    }
}
function tsExpectThenParseType(parser, token) {
    return tsDoThenParseType(parser, () => {
        parser.expect(token);
    });
}
function tsNextThenParseType(parser) {
    return tsDoThenParseType(parser, () => parser.next());
}
exports.tsNextThenParseType = tsNextThenParseType;
function tsDoThenParseType(parser, cb) {
    cb();
    return parseTSType(parser);
}
function parseTSEnumMember(parser) {
    const start = parser.getPosition();
    // Computed property names are grammar errors in an enum, so accept just string literal or identifier.
    const id = parser.match(types_1.types.string)
        ? index_1.parseStringLiteral(parser)
        : index_1.parseIdentifier(parser, /* liberal */ true);
    let initializer;
    if (parser.eat(types_1.types.eq)) {
        initializer = index_1.parseMaybeAssign(parser, 'ts enum member initializer');
    }
    return parser.finishNode(start, {
        type: 'TSEnumMember',
        initializer,
        id,
    });
}
function parseTSEnumDeclaration(parser, start, isConst) {
    parser.addDiagnosticFilter({
        message: 'enum is a reserved word',
        start,
    });
    const id = index_1.parseBindingIdentifier(parser);
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'ts enum declaration');
    const members = parseTSDelimitedList(parser, 'EnumMembers', parseTSEnumMember);
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'TSEnumDeclaration',
        members,
        id,
        const: isConst,
    });
}
exports.parseTSEnumDeclaration = parseTSEnumDeclaration;
function parseTSModuleBlock(parser) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'ts module block');
    // Inside of a module block is considered 'top-level', meaning it can have imports and exports.
    const { body } = index_1.parseBlockOrModuleBlockBody(parser, 
    /* allowDirectives */ false, 
    /* topLevel */ true, openContext);
    return parser.finishNode(start, {
        type: 'TSModuleBlock',
        body,
    });
}
exports.parseTSModuleBlock = parseTSModuleBlock;
function parseTSModuleOrNamespaceDeclaration(parser, start) {
    const id = index_1.parseBindingIdentifier(parser);
    let body;
    if (parser.eat(types_1.types.dot)) {
        body = parseTSModuleOrNamespaceDeclaration(parser, parser.getPosition());
    }
    else {
        body = parseTSModuleBlock(parser);
    }
    return parser.finishNode(start, {
        type: 'TSModuleDeclaration',
        id,
        body,
    });
}
exports.parseTSModuleOrNamespaceDeclaration = parseTSModuleOrNamespaceDeclaration;
function parseTSAmbientExternalModuleDeclaration(parser, start) {
    let global;
    let id;
    if (parser.isContextual('global')) {
        global = true;
        id = index_1.parseBindingIdentifier(parser);
    }
    else if (parser.match(types_1.types.string)) {
        id = index_1.parseStringLiteral(parser);
    }
    else {
        throw parser.unexpected();
    }
    let body;
    if (parser.match(types_1.types.braceL)) {
        body = parseTSModuleBlock(parser);
    }
    else {
        parser.semicolon();
    }
    return parser.finishNode(start, {
        type: 'TSModuleDeclaration',
        id,
        global,
        body,
    });
}
exports.parseTSAmbientExternalModuleDeclaration = parseTSAmbientExternalModuleDeclaration;
function parseTSImportEqualsDeclaration(parser, start, isExport = false) {
    const id = index_1.parseBindingIdentifier(parser);
    parser.expect(types_1.types.eq);
    const moduleReference = parseTSModuleReference(parser);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TSImportEqualsDeclaration',
        id,
        moduleReference,
        isExport,
    });
}
exports.parseTSImportEqualsDeclaration = parseTSImportEqualsDeclaration;
function tsIsExternalModuleReference(parser) {
    return (parser.isContextual('require') &&
        parser.lookaheadState().tokenType === types_1.types.parenL);
}
function parseTSModuleReference(parser) {
    return tsIsExternalModuleReference(parser)
        ? parseTSExternalModuleReference(parser)
        : parseTSEntityName(parser, /* allowReservedWords */ false);
}
function parseTSExternalModuleReference(parser) {
    const start = parser.getPosition();
    parser.expectContextual('require');
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'ts external module reference');
    let expression;
    if (parser.match(types_1.types.string)) {
        expression = index_1.parseStringLiteral(parser);
    }
    else {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.TS_EXTERNAL_MODULE_REFERENCE_ARG_NOT_STRING,
        });
        // Skip as much of the next expression as we can
        index_1.parseExpressionAtom(parser, 'ts external module reference expression');
        // Create a fake string literal
        expression = parser.finishNode(start, {
            type: 'StringLiteral',
            value: '',
        });
    }
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'TSExternalModuleReference',
        expression,
    });
}
function lookaheadTS(parser, f) {
    const state = parser.cloneState();
    const res = f(parser);
    parser.state = state;
    return res;
}
function tryTSParse(parser, f) {
    const state = parser.cloneState();
    const result = f(parser);
    if (result === undefined || result === false) {
        parser.state = state;
        return undefined;
    }
    else {
        return result;
    }
}
function parseTSDeclare(parser, start) {
    let starttype = parser.state.tokenType;
    let kind;
    if (parser.isContextual('let')) {
        starttype = types_1.types._var;
        kind = 'let';
    }
    if (starttype === types_1.types._const &&
        parser.match(types_1.types._const) &&
        parser.isLookaheadContextual('enum')) {
        // `const enum = 0;` not allowed because 'enum' is a strict mode reserved word.
        parser.expect(types_1.types._const);
        parser.expectContextual('enum');
        return {
            declare: true,
            ...parseTSEnumDeclaration(parser, start, /* isConst */ true),
        };
    }
    switch (starttype) {
        case types_1.types._function:
            return {
                ...index_1.parseFunctionDeclaration(parser, start, false),
                declare: true,
            };
        case types_1.types._class:
            return {
                ...index_1.parseClassDeclaration(parser, start),
                declare: true,
            };
        case types_1.types._const:
        case types_1.types._var: {
            kind =
                kind === undefined
                    ? index_1.assertVarKind(String(parser.state.tokenValue))
                    : kind;
            return {
                declare: true,
                ...index_1.parseVarStatement(parser, start, kind),
            };
        }
        case types_1.types.name: {
            const value = String(parser.state.tokenValue);
            if (value === 'global') {
                return {
                    declare: true,
                    ...parseTSAmbientExternalModuleDeclaration(parser, start),
                };
            }
            else if (isTSDeclarationStart(parser)) {
                const id = index_1.parseReferenceIdentifier(parser);
                const decl = index_1.parseTypeExpressionStatement(parser, start, id);
                if (decl === undefined) {
                    throw new Error('Should have returned a node');
                }
                if (decl.type !== 'TSInterfaceDeclaration' &&
                    decl.type !== 'TypeAliasTypeAnnotation' &&
                    decl.type !== 'TSEnumDeclaration' &&
                    decl.type !== 'FunctionDeclaration' &&
                    decl.type !== 'ClassDeclaration' &&
                    decl.type !== 'VariableDeclarationStatement' &&
                    decl.type !== 'TSDeclareFunction' &&
                    decl.type !== 'TSModuleDeclaration') {
                    throw new Error('Encountered a non-TS declare node when calling parseTypeExpressionStatement');
                }
                return { ...decl, declare: true };
            }
        }
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.TS_UNKNOWN_DECLARE_START,
    });
    // Fake node
    const loc = parser.finishLoc(start);
    return {
        type: 'VariableDeclarationStatement',
        loc,
        declaration: {
            type: 'VariableDeclaration',
            loc,
            kind: 'var',
            declarations: [
                {
                    type: 'VariableDeclarator',
                    loc,
                    id: index_1.toBindingIdentifier(parser, parser.createUnknownIdentifier('typescript declare start', start)),
                    init: undefined,
                },
            ],
        },
    };
}
exports.parseTSDeclare = parseTSDeclare;
function parseTSAbstractClass(parser, start) {
    return {
        ...index_1.parseClassDeclaration(parser, start),
        abstract: true,
    };
}
exports.parseTSAbstractClass = parseTSAbstractClass;
function parseTSExportDefaultAbstractClass(parser, start) {
    return {
        ...index_1.parseExportDefaultClassDeclaration(parser, start),
        abstract: true,
    };
}
exports.parseTSExportDefaultAbstractClass = parseTSExportDefaultAbstractClass;
function parseTSTypeArguments(parser) {
    const start = parser.getPosition();
    parser.pushScope('TYPE', true);
    const params = tsInNoContext(parser, () => {
        parser.expectRelational('<');
        return parseTSDelimitedList(parser, 'TypeParametersOrArguments', parseTSType);
    });
    // This reads the next token after the `>` too, so do parser.in the enclosing context.
    // But be sure not to parse a regex in the jsx expression `<C<number> />`, so set exprAllowed = false
    parser.state.exprAllowed = false;
    parser.popScope('TYPE');
    parser.expectRelational('>');
    return parser.finishNode(start, {
        type: 'TSTypeParameterInstantiation',
        params,
    });
}
exports.parseTSTypeArguments = parseTSTypeArguments;
function isTSDeclarationStart(parser) {
    if (parser.match(types_1.types.name)) {
        switch (parser.state.tokenValue) {
            case 'abstract':
            case 'declare':
            case 'enum':
            case 'interface':
            case 'module':
            case 'namespace':
            case 'type':
                return true;
        }
    }
    return false;
}
exports.isTSDeclarationStart = isTSDeclarationStart;
function parseTSAccessModifier(parser) {
    return parseTSModifier(parser, ['public', 'protected', 'private']);
}
exports.parseTSAccessModifier = parseTSAccessModifier;
function isTSAbstractClass(parser) {
    return (parser.isContextual('abstract') &&
        parser.lookaheadState().tokenType === types_1.types._class);
}
exports.isTSAbstractClass = isTSAbstractClass;
function parseTSExport(parser, start) {
    if (!parser.isSyntaxEnabled('ts')) {
        return undefined;
    }
    if (parser.match(types_1.types._import)) {
        // `export const A =B;`
        parser.expect(types_1.types._import);
        return parseTSImportEqualsDeclaration(parser, start, /* isExport */ true);
    }
    if (parser.eat(types_1.types.eq)) {
        // `export = x;`
        const expression = index_1.parseExpression(parser, 'ts export assignment');
        parser.semicolon();
        return parser.finishNode(start, {
            type: 'TSExportAssignment',
            expression,
        });
    }
    if (parser.eatContextual('as')) {
        // `export as namespace A;`
        // See `parseNamespaceExportDeclaration` in TypeScript's own parser
        parser.expectContextual('namespace');
        const id = index_1.parseIdentifier(parser);
        parser.semicolon();
        return parser.finishNode(start, {
            type: 'TSNamespaceExportDeclaration',
            id,
        });
    }
    return undefined;
}
exports.parseTSExport = parseTSExport;
