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
const ob1_1 = require("@romejs/ob1");
const diagnostics_1 = require("@romejs/diagnostics");
const expression_1 = require("./expression");
const primitiveTypes = [
    'any',
    'bool',
    'boolean',
    'empty',
    'false',
    'mixed',
    'null',
    'number',
    'bigint',
    'static',
    'string',
    'true',
    'typeof',
    'void',
    'interface',
    'extends',
    '_',
];
const exportSuggestions = new Map([
    ['const', 'declare export var'],
    ['let', 'declare export var'],
    ['type', 'export type'],
    ['interface', 'export interface'],
]);
function checkNotUnderscore(parser, id) {
    if (id.name === '_') {
        parser.addDiagnostic({
            loc: id.loc,
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_BAD_UNDERSCORE_NAME,
        });
    }
}
function isEsModuleType(bodyElement) {
    return (bodyElement.type === 'ExportAllDeclaration' ||
        (bodyElement.type === 'ExportLocalDeclaration' &&
            (!bodyElement.declaration ||
                (bodyElement.declaration.type !== 'TypeAliasTypeAnnotation' &&
                    bodyElement.declaration.type !== 'FlowInterfaceDeclaration'))));
}
function hasTypeImportKind(kind) {
    return kind === 'type' || kind === 'typeof';
}
exports.hasTypeImportKind = hasTypeImportKind;
function isMaybeDefaultImport(state) {
    return ((state.tokenType === types_1.types.name || !!state.tokenType.keyword) &&
        state.tokenValue !== 'from');
}
exports.isMaybeDefaultImport = isMaybeDefaultImport;
function parseFlowTypeParameterInstantiationCallOrNew(parser) {
    const start = parser.getPosition();
    const params = [];
    parser.pushScope('TYPE', true);
    if (parser.expectRelational('<')) {
        while (!parser.isRelational('>')) {
            params.push(parseFlowTypeOrImplicitInstantiation(parser));
            if (!parser.isRelational('>') && !parser.expect(types_1.types.comma)) {
                break;
            }
        }
        parser.expectRelational('>');
    }
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'FlowTypeParameterInstantiation',
        params,
    });
}
exports.parseFlowTypeParameterInstantiationCallOrNew = parseFlowTypeParameterInstantiationCallOrNew;
function parseFlowTypeOrImplicitInstantiation(parser) {
    if (parser.state.tokenType === types_1.types.name && parser.state.tokenValue === '_') {
        const startPos = parser.state.startPos;
        const node = expression_1.parseReferenceIdentifier(parser);
        return parseFlowGenericType(parser, startPos, node);
    }
    else {
        return parseFlowType(parser);
    }
}
function parseFlowTypeInitialiser(parser, tok) {
    parser.pushScope('TYPE', true);
    parser.expect(tok || types_1.types.colon);
    const type = parseFlowType(parser);
    parser.popScope('TYPE');
    return type;
}
function parseFlowPredicate(parser) {
    const start = parser.getPosition();
    const moduloPos = parser.state.startPos;
    parser.expect(types_1.types.modulo);
    const checksPos = parser.state.startPos;
    parser.expectContextual('checks');
    // Force '%' and 'checks' to be adjacent
    if (moduloPos.line !== checksPos.line ||
        ob1_1.ob1Get0(moduloPos.column) !== ob1_1.ob1Get0(checksPos.column) - 1) {
        parser.addDiagnostic({
            start: moduloPos,
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_SPACE_BETWEEN_PERCENT_CHECKS,
        });
    }
    if (parser.match(types_1.types.parenL)) {
        const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'flow declared predicate');
        const value = index_1.parseExpression(parser, 'flow declared predicate');
        parser.expectClosing(openContext);
        return parser.finishNode(start, {
            type: 'FlowDeclaredPredicate',
            value,
        });
    }
    else {
        return parser.finishNode(start, {
            type: 'FlowInferredPredicate',
        });
    }
}
function parseFlowTypeAndPredicateInitialiser(parser) {
    index_1.addFlowDiagnostic(parser, ' flow type and predicate initializer', parser.getPosition());
    parser.pushScope('TYPE', true);
    parser.expect(types_1.types.colon);
    let type = undefined;
    let predicate = undefined;
    if (parser.match(types_1.types.modulo)) {
        parser.popScope('TYPE');
        predicate = parseFlowPredicate(parser);
    }
    else {
        type = parseFlowType(parser);
        parser.popScope('TYPE');
        if (parser.match(types_1.types.modulo)) {
            predicate = parseFlowPredicate(parser);
        }
    }
    return [type, predicate];
}
exports.parseFlowTypeAndPredicateInitialiser = parseFlowTypeAndPredicateInitialiser;
function parseFlowDeclareClass(parser, start) {
    parser.next();
    return parser.finishNode(start, {
        ...parseFlowInterfaceish(parser, true),
        type: 'FlowDeclareClass',
    });
}
function parseFlowDeclareFunction(parser, start) {
    parser.next();
    const id = index_1.parseIdentifier(parser);
    let typeParameters = undefined;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterDeclaration(parser, true);
    }
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'flow function type params');
    const { params, rest } = parseFlowFunctionTypeParams(parser);
    parser.expectClosing(openContext);
    const [returnType, predicate] = parseFlowTypeAndPredicateInitialiser(parser);
    parser.semicolon();
    if (predicate !== undefined && predicate.type === 'FlowInferredPredicate') {
        parser.addDiagnostic({
            loc: predicate.loc,
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_UNINFERRABLE_PREDICATE_ON_FUNCTION,
        });
    }
    return parser.finishNode(start, {
        type: 'FlowDeclareFunction',
        id: parser.finishNode(start, {
            type: 'BindingIdentifier',
            name: id.name,
            meta: parser.finishNode(start, {
                type: 'PatternMeta',
                typeAnnotation: parser.finishNode(start, {
                    type: 'FlowFunctionTypeAnnotation',
                    params,
                    rest,
                    returnType,
                    typeParameters,
                }),
            }),
        }),
        predicate,
    });
}
function parseFlowDeclare(parser, start, insideModule = false) {
    index_1.addFlowDiagnostic(parser, 'type declaration', start);
    if (parser.match(types_1.types._class)) {
        return parseFlowDeclareClass(parser, start);
    }
    if (parser.match(types_1.types._function)) {
        return parseFlowDeclareFunction(parser, start);
    }
    if (parser.match(types_1.types._var)) {
        return parseFlowDeclareVariable(parser, start);
    }
    if (parser.isContextual('module')) {
        if (parser.lookaheadState().tokenType === types_1.types.dot) {
            return parseFlowDeclareModuleExports(parser, start);
        }
        else {
            if (insideModule) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.FLOW_DECLARE_MODULE_IN_DECLARE_MODULE,
                });
            }
            return parseFlowDeclareModule(parser, start);
        }
    }
    if (parser.isContextual('type')) {
        return parseFlowDeclareTypeAlias(parser, start);
    }
    if (parser.isContextual('opaque')) {
        return parseFlowDeclareOpaqueType(parser, start);
    }
    if (parser.isContextual('interface')) {
        return parseFlowDeclareInterface(parser, start);
    }
    if (parser.match(types_1.types._export)) {
        return parseExportLocalDeclaration(parser, start, insideModule);
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.FLOW_UNKNOWN_DECLARATION_START,
    });
    // Fake node
    return parser.finishNode(start, {
        type: 'FlowDeclareVariable',
        id: index_1.toBindingIdentifier(parser, parser.createUnknownIdentifier('flow declaration', start)),
    });
}
exports.parseFlowDeclare = parseFlowDeclare;
function parseFlowDeclareVariable(parser, start) {
    parser.next();
    const id = parseFlowTypeAnnotatableIdentifier(parser, 
    /*allowPrimitiveOverride*/ true);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'FlowDeclareVariable',
        id,
    });
}
function parseFlowDeclareModule(parser, start) {
    // Eat `module` token
    parser.next();
    let id;
    if (parser.match(types_1.types.string)) {
        id = index_1.parseStringLiteral(parser);
    }
    else {
        id = index_1.parseBindingIdentifier(parser);
    }
    const bodyStart = parser.getPosition();
    const body = [];
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'flow declare module body');
    while (!parser.match(types_1.types.braceR)) {
        let bodyNodeStart = parser.getPosition();
        let bodyNode;
        if (parser.match(types_1.types._import)) {
            const lookahead = parser.lookaheadState();
            if (lookahead.tokenValue !== 'type' && lookahead.tokenValue !== 'typeof') {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.FLOW_IMPORT_KINDLESS_IN_DECLARE_MODULE,
                });
            }
            parser.next();
            bodyNode = index_1.parseImport(parser, bodyNodeStart);
        }
        else {
            if (!parser.expectContextual('declare', diagnostics_1.descriptions.JS_PARSER.FLOW_DECLARE_MODULE_INVALID_CHILD)) {
                break;
            }
            bodyNode = parseFlowDeclare(parser, bodyNodeStart, true);
        }
        body.push(bodyNode);
    }
    parser.expectClosing(openContext);
    const bodyNode = parser.finishNode(bodyStart, {
        type: 'BlockStatement',
        body,
    });
    let kind;
    let hasModuleExport = false;
    for (const bodyElement of body) {
        if (isEsModuleType(bodyElement)) {
            if (kind === 'commonjs') {
                parser.addDiagnostic({
                    loc: bodyElement.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.FLOW_MIXED_DECLARE_EXPORTS,
                });
            }
            kind = 'es';
        }
        else if (bodyElement.type === 'FlowDeclareModuleExports') {
            if (hasModuleExport) {
                parser.addDiagnostic({
                    loc: bodyElement.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.FLOW_DUPLICATE_DECLARE_MODULE_EXPORTS,
                });
            }
            if (kind === 'es') {
                parser.addDiagnostic({
                    loc: bodyElement.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.FLOW_MIXED_DECLARE_EXPORTS,
                });
            }
            kind = 'commonjs';
            hasModuleExport = true;
        }
    }
    return parser.finishNode(start, {
        type: 'FlowDeclareModule',
        id,
        kind: kind === undefined ? 'commonjs' : kind,
        body: bodyNode,
    });
}
function parseExportLocalDeclaration(parser, start, insideModule) {
    parser.expect(types_1.types._export);
    if (parser.eat(types_1.types._default)) {
        let declaration;
        if (parser.match(types_1.types._function) || parser.match(types_1.types._class)) {
            // declare export default class ...
            // declare export default function ...
            declaration = parseFlowDeclare(parser, parser.getPosition());
        }
        else {
            // declare export default [type];
            declaration = parseFlowType(parser);
            parser.semicolon();
        }
        return parser.finishNode(start, {
            type: 'FlowDeclareExportDefault',
            declaration,
        });
    }
    else {
        if (parser.match(types_1.types._const) ||
            index_1.isLetStart(parser) ||
            ((parser.isContextual('type') || parser.isContextual('interface')) &&
                !insideModule)) {
            const label = String(parser.state.tokenValue);
            const suggestion = String(exportSuggestions.get(label));
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_DECLARE_EXPORT_UNSUPPORTED(label, suggestion),
            });
        }
        if (
        // declare export var ...
        parser.match(types_1.types._var) ||
            // declare function ...
            parser.match(types_1.types._function) ||
            // declare export class ...
            parser.match(types_1.types._class) ||
            // declare export opaque ..
            parser.isContextual('opaque')) {
            const declaration = parseFlowDeclare(parser, parser.getPosition());
            return parser.finishNode(start, {
                type: 'FlowDeclareExportNamed',
                declaration,
            });
        }
        if (
        // declare export * from '';
        parser.match(types_1.types.star) ||
            // declare export {} ...
            parser.match(types_1.types.braceL) ||
            // declare export interface ...
            parser.isContextual('interface') ||
            // declare export type ...
            parser.isContextual('type') ||
            // declare export opaque type ...
            parser.isContextual('opaque')) {
            const node = index_1.parseExport(parser, start);
            if (node !== undefined) {
                if (node.type === 'ExportLocalDeclaration' ||
                    node.type === 'ExportExternalDeclaration') {
                    return {
                        ...node,
                        type: 'FlowDeclareExportNamed',
                    };
                }
                else if (node.type === 'ExportAllDeclaration') {
                    return {
                        ...node,
                        type: 'FlowDeclareExportAll',
                    };
                }
            }
        }
    }
    parser.addDiagnostic({
        start,
        description: diagnostics_1.descriptions.JS_PARSER.FLOW_UNKNOWN_DECLARE_EXPORT_START,
    });
    // Fake node
    return parser.finishNode(start, {
        type: 'FlowDeclareExportDefault',
        declaration: {
            ...parser.createUnknownStringLiteral('flow declare export declaration', start),
            type: 'StringLiteralTypeAnnotation',
        },
    });
}
function parseFlowDeclareModuleExports(parser, start) {
    parser.expectContextual('module');
    parser.expect(types_1.types.dot);
    parser.expectContextual('exports');
    const typeAnnotation = parseFlowTypeAnnotation(parser);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'FlowDeclareModuleExports',
        typeAnnotation,
    });
}
function parseFlowDeclareTypeAlias(parser, start) {
    parser.next();
    return {
        ...parseFlowTypeAliasTypeAnnotation(parser, start),
        declare: true,
    };
}
function parseFlowDeclareOpaqueType(parser, start) {
    parser.next();
    const opaque = parseFlowOpaqueType(parser, start, true);
    return parser.finishNode(start, {
        ...opaque,
        type: 'FlowDeclareOpaqueType',
    });
}
function parseFlowDeclareInterface(parser, start) {
    parser.next();
    return parser.finishNode(start, {
        ...parseFlowInterfaceish(parser),
        type: 'FlowDeclareInterface',
    });
}
// Interfaces
function parseFlowInterfaceish(parser, isClass = false) {
    const id = parseFlowRestrictedIdentifier(parser, /*liberal*/ !isClass);
    let typeParameters = undefined;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterDeclaration(parser, true);
    }
    const _extends = [];
    const mixins = [];
    const _implements = [];
    if (parser.eat(types_1.types._extends)) {
        do {
            _extends.push(parseFlowInterfaceExtends(parser));
        } while (!isClass && parser.eat(types_1.types.comma));
    }
    if (parser.isContextual('mixins')) {
        parser.next();
        do {
            mixins.push(parseFlowInterfaceExtends(parser));
        } while (parser.eat(types_1.types.comma));
    }
    if (parser.isContextual('implements')) {
        parser.next();
        do {
            _implements.push(parseFlowInterfaceExtends(parser));
        } while (parser.eat(types_1.types.comma));
    }
    const body = parseFlowObjectType(parser, {
        allowStatic: isClass,
        allowExact: false,
        allowSpread: false,
        allowProto: isClass,
        allowInexact: false,
    });
    return {
        body,
        extends: _extends,
        mixins,
        id,
        typeParameters,
        implements: _implements,
    };
}
function parseFlowInterfaceType(parser) {
    const start = parser.getPosition();
    parser.expectContextual('interface');
    const _extends = [];
    if (parser.eat(types_1.types._extends)) {
        do {
            _extends.push(parseFlowInterfaceExtends(parser));
        } while (parser.eat(types_1.types.comma));
    }
    const body = parseFlowObjectType(parser, {
        allowStatic: false,
        allowExact: false,
        allowSpread: false,
        allowProto: false,
        allowInexact: false,
    });
    return parser.finishNode(start, {
        type: 'FlowInterfaceTypeAnnotation',
        extends: _extends,
        body,
    });
}
function parseFlowInterfaceExtends(parser) {
    const start = parser.getPosition();
    const id = parseFlowQualifiedTypeIdentifier(parser);
    let typeParameters = undefined;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterInstantiation(parser);
    }
    return parser.finishNode(start, {
        type: 'FlowInterfaceExtends',
        id,
        typeParameters,
    });
}
function parseFlowInterface(parser, start) {
    index_1.addFlowDiagnostic(parser, 'interface declaration', start);
    return {
        ...parseFlowInterfaceish(parser),
        loc: parser.finishLoc(start),
        type: 'FlowInterfaceDeclaration',
    };
}
exports.parseFlowInterface = parseFlowInterface;
function checkReservedType(parser, word, loc) {
    if (primitiveTypes.includes(word)) {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_RESERVED_TYPE(word),
        });
    }
}
exports.checkReservedType = checkReservedType;
function parseFlowRestrictedIdentifier(parser, liberal) {
    checkReservedType(parser, String(parser.state.tokenValue), parser.finishLocAt(parser.state.startPos, parser.state.endPos));
    return index_1.parseBindingIdentifier(parser, liberal);
}
exports.parseFlowRestrictedIdentifier = parseFlowRestrictedIdentifier;
// Type aliases
function parseFlowTypeAliasTypeAnnotation(parser, start) {
    index_1.addFlowDiagnostic(parser, 'type alias', start);
    const id = parseFlowRestrictedIdentifier(parser);
    let typeParameters;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterDeclaration(parser, true);
    }
    else {
        typeParameters = undefined;
    }
    const right = parseFlowTypeInitialiser(parser, types_1.types.eq);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'TypeAliasTypeAnnotation',
        id,
        typeParameters,
        right,
    });
}
exports.parseFlowTypeAliasTypeAnnotation = parseFlowTypeAliasTypeAnnotation;
function parseFlowOpaqueType(parser, start, declare) {
    index_1.addFlowDiagnostic(parser, 'opaque type', start);
    parser.expectContextual('type');
    const id = parseFlowRestrictedIdentifier(parser, /*liberal*/ true);
    let typeParameters;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterDeclaration(parser, true);
    }
    else {
        typeParameters = undefined;
    }
    // Parse the supertype
    let supertype = undefined;
    if (parser.match(types_1.types.colon)) {
        supertype = parseFlowTypeInitialiser(parser, types_1.types.colon);
    }
    let impltype = undefined;
    if (!declare) {
        impltype = parseFlowTypeInitialiser(parser, types_1.types.eq);
    }
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'FlowOpaqueType',
        id,
        typeParameters,
        supertype,
        impltype,
    });
}
exports.parseFlowOpaqueType = parseFlowOpaqueType;
function parseFlowTypeParameter(parser, allowDefault = true, requireDefault = false) {
    const start = parser.getPosition();
    const variance = parseFlowVariance(parser);
    const ident = parseFlowTypeAnnotatableIdentifier(parser);
    const name = ident.name;
    const bound = ident.meta !== undefined ? ident.meta.typeAnnotation : undefined;
    let def;
    if (parser.match(types_1.types.eq)) {
        if (!allowDefault) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_DISALLOW_DEFAULT_TYPE_PARAMETER,
            });
        }
        parser.eat(types_1.types.eq);
        def = parseFlowType(parser);
    }
    else if (requireDefault) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_DEFAULT_TYPE_PARAMETER_REQUIRED,
        });
    }
    return parser.finishNode(start, {
        type: 'FlowTypeParameter',
        default: def,
        name,
        variance,
        bound,
    });
}
function parseFlowTypeParameterDeclaration(parser, allowDefault) {
    const start = parser.getPosition();
    index_1.addFlowDiagnostic(parser, 'type parameter declaration', start);
    const params = [];
    parser.pushScope('TYPE', true);
    parser.expectRelational('<');
    let defaultRequired = false;
    do {
        const param = parseFlowTypeParameter(parser, allowDefault, defaultRequired);
        if (param.default) {
            defaultRequired = true;
        }
        params.push(param);
        if (!parser.isRelational('>') && !parser.expect(types_1.types.comma)) {
            break;
        }
    } while (!parser.isRelational('>'));
    parser.expectRelational('>');
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'FlowTypeParameterDeclaration',
        params,
    });
}
exports.parseFlowTypeParameterDeclaration = parseFlowTypeParameterDeclaration;
function parseFlowTypeParameterInstantiation(parser) {
    const start = parser.getPosition();
    index_1.addFlowDiagnostic(parser, 'type parameter instantiation', start);
    const params = [];
    parser.pushScope('TYPE', true);
    parser.expectRelational('<');
    const oldNoAnonFunctionType = parser.state.noAnonFunctionType;
    parser.state.noAnonFunctionType = false;
    while (!parser.isRelational('>')) {
        params.push(parseFlowType(parser));
        if (!parser.isRelational('>') && !parser.expect(types_1.types.comma)) {
            break;
        }
    }
    parser.state.noAnonFunctionType = oldNoAnonFunctionType;
    parser.expectRelational('>');
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'FlowTypeParameterInstantiation',
        params,
    });
}
exports.parseFlowTypeParameterInstantiation = parseFlowTypeParameterInstantiation;
function parseFlowObjectPropertyKey(parser) {
    if (parser.match(types_1.types.num)) {
        return index_1.parseNumericLiteral(parser);
    }
    else if (parser.match(types_1.types.string)) {
        return index_1.parseStringLiteral(parser);
    }
    else {
        return index_1.parseIdentifier(parser, true);
    }
}
function parseFlowObjectTypeIndexer(parser, start, isStatic, variance) {
    let id;
    let key;
    // Note: bracketL has already been consumed
    if (parser.lookaheadState().tokenType === types_1.types.colon) {
        id = parseFlowObjectPropertyKey(parser);
        key = parseFlowTypeInitialiser(parser);
    }
    else {
        id = undefined;
        key = parseFlowType(parser);
    }
    parser.expect(types_1.types.bracketR);
    const value = parseFlowTypeInitialiser(parser);
    return parser.finishNode(start, {
        type: 'FlowObjectTypeIndexer',
        static: isStatic,
        key,
        id,
        value,
        variance,
    });
}
function parseFlowObjectTypeMethodish(parser, start) {
    let typeParameters = undefined;
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterDeclaration(parser, false);
    }
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'function object method params');
    const { params, rest } = parseFlowFunctionTypeParams(parser);
    parser.expectClosing(openContext);
    const returnType = parseFlowTypeInitialiser(parser);
    return parser.finishNode(start, {
        type: 'FlowFunctionTypeAnnotation',
        params,
        rest,
        typeParameters,
        returnType,
    });
}
function parseFlowObjectTypeCallProperty(parser, start, isStatic) {
    const valueNode = parser.getPosition();
    const value = parseFlowObjectTypeMethodish(parser, valueNode);
    return parser.finishNode(start, {
        type: 'FlowObjectTypeCallProperty',
        static: isStatic,
        value,
    });
}
function parseFlowObjectType(parser, opts) {
    const { allowExact, allowSpread, allowProto, allowInexact } = opts;
    let { allowStatic } = opts;
    parser.pushScope('TYPE', true);
    const start = parser.getPosition();
    const properties = [];
    let openContext;
    let exact;
    let inexact;
    if (allowExact && parser.match(types_1.types.braceBarL)) {
        openContext = parser.expectOpening(types_1.types.braceBarL, types_1.types.braceBarR, 'flow exact object');
        exact = true;
    }
    else {
        openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'flow object');
        exact = false;
    }
    while (true) {
        if (parser.match(types_1.types.eof) || parser.match(openContext.close)) {
            break;
        }
        const start = parser.getPosition();
        let isStatic = false;
        let protoStart = undefined;
        if (allowProto && parser.isContextual('proto')) {
            const lookahead = parser.lookaheadState();
            if (lookahead.tokenType !== types_1.types.colon &&
                lookahead.tokenType !== types_1.types.question) {
                parser.next();
                protoStart = parser.state.startPos;
                allowStatic = false;
            }
        }
        if (allowStatic && parser.isContextual('static')) {
            const lookahead = parser.lookaheadState();
            // static is a valid identifier name
            if (lookahead.tokenType !== types_1.types.colon &&
                lookahead.tokenType !== types_1.types.question) {
                parser.next();
                isStatic = true;
            }
        }
        const variance = parseFlowVariance(parser);
        if (parser.eat(types_1.types.bracketL)) {
            if (protoStart !== undefined) {
                parser.unexpectedToken(protoStart);
            }
            if (parser.eat(types_1.types.bracketL)) {
                if (variance) {
                    parser.addDiagnostic({
                        loc: variance.loc,
                        description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
                    });
                }
                properties.push(parseFlowObjectTypeInternalSlot(parser, start, isStatic));
            }
            else {
                properties.push(parseFlowObjectTypeIndexer(parser, start, isStatic, variance));
            }
        }
        else if (parser.match(types_1.types.parenL) || parser.isRelational('<')) {
            if (protoStart !== undefined) {
                parser.unexpectedToken(protoStart);
            }
            if (variance) {
                parser.addDiagnostic({
                    loc: variance.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
                });
            }
            properties.push(parseFlowObjectTypeCallProperty(parser, start, isStatic));
        }
        else {
            let kind = 'init';
            if (parser.isContextual('get') || parser.isContextual('set')) {
                const lookahead = parser.lookaheadState();
                if (lookahead.tokenType === types_1.types.name ||
                    lookahead.tokenType === types_1.types.string ||
                    lookahead.tokenType === types_1.types.num) {
                    const value = String(parser.state.tokenValue);
                    if (value !== 'get' && value !== 'set') {
                        throw new Error('Expected get or set as we already validated it above');
                    }
                    kind = value;
                    parser.next();
                }
            }
            const propOrInexact = parseFlowObjectTypeProperty(parser, {
                start,
                isStatic,
                protoStart,
                variance,
                kind,
                allowSpread,
                allowInexact,
            });
            if (propOrInexact === undefined) {
                inexact = true;
            }
            else {
                properties.push(propOrInexact);
            }
        }
        flowObjectTypeSemicolon(parser);
    }
    parser.expectClosing(openContext);
    parser.popScope('TYPE');
    return parser.finishNode(start, {
        type: 'FlowObjectTypeAnnotation',
        properties,
        exact,
        inexact,
    });
}
function parseFlowObjectTypeProperty(parser, opts) {
    const { start, isStatic, protoStart, variance, kind, allowSpread, allowInexact, } = opts;
    if (parser.match(types_1.types.ellipsis)) {
        if (!allowSpread) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_DISALLOWED_SPREAD,
            });
        }
        if (protoStart !== undefined) {
            parser.unexpectedToken(protoStart);
        }
        if (variance) {
            parser.addDiagnostic({
                loc: variance.loc,
                description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
            });
        }
        parser.expect(types_1.types.ellipsis);
        const isInexactToken = parser.eat(types_1.types.comma) || parser.eat(types_1.types.semi);
        if (parser.match(types_1.types.braceR)) {
            if (allowInexact) {
                return undefined;
            }
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_INEXACT_SYNTAX_NOT_ALLOWED,
            });
        }
        if (parser.match(types_1.types.braceBarR)) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_INEXACT_CANNOT_APPEAR_IN_EXPLICIT_EXACT,
            });
        }
        if (isInexactToken) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_INEXACT_MUST_BE_AT_END,
            });
        }
        const argument = parseFlowType(parser);
        return parser.finishNode(start, {
            type: 'FlowObjectTypeSpreadProperty',
            argument,
        });
    }
    else {
        const proto = protoStart !== undefined;
        const key = parseFlowObjectPropertyKey(parser);
        let value = undefined;
        let optional = false;
        if (parser.isRelational('<') || parser.match(types_1.types.parenL)) {
            if (protoStart !== undefined) {
                parser.unexpectedToken(protoStart);
            }
            if (variance) {
                parser.addDiagnostic({
                    loc: variance.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
                });
            }
            value = parseFlowObjectTypeMethodish(parser, start);
            if (kind === 'get' || kind === 'set') {
                index_1.checkGetterSetterParamCount(parser, value, kind);
            }
        }
        else {
            if (kind !== 'init') {
                parser.unexpectedToken();
            }
            if (parser.eat(types_1.types.question)) {
                optional = true;
            }
            value = parseFlowTypeInitialiser(parser);
        }
        return parser.finishNode(start, {
            type: 'FlowObjectTypeProperty',
            key,
            static: isStatic,
            kind,
            value,
            variance,
            optional,
            proto,
        });
    }
}
function flowObjectTypeSemicolon(parser) {
    if (!parser.eat(types_1.types.semi) &&
        !parser.eat(types_1.types.comma) &&
        !parser.match(types_1.types.braceR) &&
        !parser.match(types_1.types.braceBarR)) {
        parser.unexpectedToken();
    }
}
function parseFlowQualifiedTypeIdentifier(parser, start = parser.getPosition(), id) {
    let node = id === undefined ? expression_1.parseReferenceIdentifier(parser) : id;
    while (parser.eat(types_1.types.dot)) {
        const id = index_1.parseIdentifier(parser);
        node = parser.finishNode(start, {
            type: 'FlowQualifiedTypeIdentifier',
            id,
            qualification: node,
        });
    }
    return node;
}
function parseFlowGenericType(parser, start, _id) {
    let typeParameters = undefined;
    const id = parseFlowQualifiedTypeIdentifier(parser, start, _id);
    if (parser.isRelational('<')) {
        typeParameters = parseFlowTypeParameterInstantiation(parser);
    }
    return parser.finishNode(start, {
        type: 'FlowGenericTypeAnnotation',
        id,
        typeParameters,
    });
}
function parseFlowTypeofType(parser) {
    const start = parser.getPosition();
    parser.expect(types_1.types._typeof);
    const argument = parseFlowPrimaryType(parser);
    return parser.finishNode(start, {
        type: 'FlowTypeofTypeAnnotation',
        argument,
    });
}
function parseFlowTupleType(parser) {
    const start = parser.getPosition();
    const types = [];
    const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'flow tuple type');
    // We allow trailing commas
    while (parser.state.index < parser.length && !parser.match(types_1.types.bracketR)) {
        types.push(parseFlowType(parser));
        if (parser.match(types_1.types.bracketR)) {
            break;
        }
        if (!parser.expect(types_1.types.comma)) {
            break;
        }
    }
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'FlowTupleTypeAnnotation',
        types,
    });
}
function parseFlowFunctionTypeParam(parser) {
    let name = undefined;
    let optional = false;
    let typeAnnotation = undefined;
    const start = parser.getPosition();
    const lh = parser.lookaheadState();
    if (lh.tokenType === types_1.types.colon || lh.tokenType === types_1.types.question) {
        name = index_1.parseIdentifier(parser);
        if (parser.eat(types_1.types.question)) {
            optional = true;
        }
        typeAnnotation = parseFlowTypeInitialiser(parser);
    }
    else {
        typeAnnotation = parseFlowType(parser);
    }
    return parser.finishNode(start, {
        type: 'FlowFunctionTypeParam',
        name,
        meta: parser.finishNode(start, {
            type: 'PatternMeta',
            optional,
            typeAnnotation,
        }),
    });
}
function reinterpretTypeAsFlowFunctionTypeParam(parser, type) {
    const loc = parser.finishLoc(parser.getLoc(type).start);
    return {
        type: 'FlowFunctionTypeParam',
        loc,
        name: undefined,
        meta: {
            type: 'PatternMeta',
            loc,
            optional: false,
            typeAnnotation: type,
        },
    };
}
function parseFlowFunctionTypeParams(parser) {
    const params = [];
    let rest;
    while (!parser.match(types_1.types.parenR) && !parser.match(types_1.types.ellipsis)) {
        params.push(parseFlowFunctionTypeParam(parser));
        if (!parser.match(types_1.types.parenR) && !parser.expect(types_1.types.comma)) {
            break;
        }
    }
    if (parser.eat(types_1.types.ellipsis)) {
        const param = parseFlowFunctionTypeParam(parser);
        rest = param;
        // TODO warn on additional elements?
    }
    return { params, rest };
}
function flowIdentToTypeAnnotation(parser, start, id) {
    switch (id.name) {
        case 'any':
            return parser.finishNode(start, {
                type: 'AnyKeywordTypeAnnotation',
            });
        case 'bool':
        case 'boolean':
            return parser.finishNode(start, {
                type: 'BooleanKeywordTypeAnnotation',
            });
        case 'mixed':
            return parser.finishNode(start, {
                type: 'MixedKeywordTypeAnnotation',
            });
        case 'empty':
            return parser.finishNode(start, {
                type: 'EmptyKeywordTypeAnnotation',
            });
        case 'number':
            return parser.finishNode(start, {
                type: 'NumberKeywordTypeAnnotation',
            });
        case 'string':
            return parser.finishNode(start, {
                type: 'StringKeywordTypeAnnotation',
            });
        case 'bigint':
            return parser.finishNode(start, {
                type: 'BigIntKeywordTypeAnnotation',
            });
        default: {
            checkNotUnderscore(parser, id);
            return parseFlowGenericType(parser, start, index_1.toReferenceIdentifier(parser, id));
        }
    }
}
// The parsing of types roughly parallels the parsing of expressions, and
// primary types are kind of like primary expressions...they're the
// primitives with which other types are constructed.
function parseFlowPrimaryType(parser) {
    const start = parser.getPosition();
    let type;
    let isGroupedType = false;
    const oldNoAnonFunctionType = parser.state.noAnonFunctionType;
    switch (parser.state.tokenType) {
        case types_1.types.name: {
            if (parser.isContextual('interface')) {
                return parseFlowInterfaceType(parser);
            }
            return flowIdentToTypeAnnotation(parser, start, index_1.parseIdentifier(parser));
        }
        case types_1.types.braceL:
            return parseFlowObjectType(parser, {
                allowStatic: false,
                allowExact: false,
                allowSpread: true,
                allowProto: false,
                allowInexact: true,
            });
        case types_1.types.braceBarL:
            return parseFlowObjectType(parser, {
                allowStatic: false,
                allowExact: true,
                allowSpread: true,
                allowProto: false,
                allowInexact: false,
            });
        case types_1.types.bracketL:
            return parseFlowTupleType(parser);
        case types_1.types.relational: {
            if (parser.state.tokenValue === '<') {
                const typeParameters = parseFlowTypeParameterDeclaration(parser, false);
                const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'flow function params');
                const { params, rest } = parseFlowFunctionTypeParams(parser);
                parser.expectClosing(openContext);
                parser.expect(types_1.types.arrow);
                const returnType = parseFlowType(parser);
                return parser.finishNode(start, {
                    type: 'FlowFunctionTypeAnnotation',
                    typeParameters,
                    params,
                    rest,
                    returnType,
                });
            }
            break;
        }
        case types_1.types.parenL: {
            const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'flow function params');
            // Check to see if this is actually a grouped type
            if (!parser.match(types_1.types.parenR) && !parser.match(types_1.types.ellipsis)) {
                if (parser.match(types_1.types.name)) {
                    const token = parser.lookaheadState().tokenType;
                    isGroupedType = token !== types_1.types.question && token !== types_1.types.colon;
                }
                else {
                    isGroupedType = true;
                }
            }
            if (isGroupedType) {
                parser.state.noAnonFunctionType = false;
                type = parseFlowType(parser);
                parser.state.noAnonFunctionType = oldNoAnonFunctionType;
                // A `,` or a `) =>` means this is an anonymous function type
                if (parser.state.noAnonFunctionType ||
                    !(parser.match(types_1.types.comma) ||
                        (parser.match(types_1.types.parenR) &&
                            parser.lookaheadState().tokenType === types_1.types.arrow))) {
                    parser.expectClosing(openContext);
                    return type;
                }
                else {
                    // Eat a comma if there is one
                    parser.eat(types_1.types.comma);
                }
            }
            let params;
            let rest;
            if (type) {
                const firstParam = reinterpretTypeAsFlowFunctionTypeParam(parser, type);
                ({ params, rest } = parseFlowFunctionTypeParams(parser));
                params = [firstParam, ...params];
            }
            else {
                ({ params, rest } = parseFlowFunctionTypeParams(parser));
            }
            parser.expectClosing(openContext);
            parser.expect(types_1.types.arrow);
            const returnType = parseFlowType(parser);
            return parser.finishNode(start, {
                type: 'FlowFunctionTypeAnnotation',
                typeParameters: undefined,
                params,
                rest,
                returnType,
            });
        }
        case types_1.types.num:
        case types_1.types.string:
        case types_1.types._true:
        case types_1.types._false:
        case types_1.types.plusMin:
            return index_1.parseTypeLiteralAnnotation(parser);
        case types_1.types._void: {
            parser.next();
            return parser.finishNode(start, { type: 'VoidKeywordTypeAnnotation' });
        }
        case types_1.types._null: {
            parser.next();
            return parser.finishNode(start, { type: 'NullKeywordTypeAnnotation' });
        }
        case types_1.types._this: {
            parser.next();
            return parser.finishNode(start, { type: 'FlowThisTypeAnnotation' });
        }
        case types_1.types.star: {
            parser.next();
            return parser.finishNode(start, { type: 'FlowExistsTypeAnnotation' });
        }
        default:
            if (parser.state.tokenType.keyword === 'typeof') {
                return parseFlowTypeofType(parser);
            }
            else if (parser.state.tokenType.keyword !== undefined) {
                const label = parser.state.tokenType.label;
                parser.next();
                const id = index_1.createIdentifier(parser, start, label);
                return flowIdentToTypeAnnotation(parser, start, id);
            }
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.FLOW_UNKNOWN_PRIMARY_START,
    });
    // Fake node
    return parser.finishNode(start, { type: 'MixedKeywordTypeAnnotation' });
}
function parseFlowPostfixType(parser) {
    const startPos = parser.state.startPos;
    let type = parseFlowPrimaryType(parser);
    while (!parser.canInsertSemicolon() && parser.match(types_1.types.bracketL)) {
        const elementType = type;
        parser.expect(types_1.types.bracketL);
        parser.expect(types_1.types.bracketR);
        type = parser.finishNode(startPos, {
            type: 'FlowArrayTypeAnnotation',
            elementType,
        });
    }
    return type;
}
function parseFlowPrefixType(parser) {
    const start = parser.getPosition();
    if (parser.eat(types_1.types.question)) {
        return parser.finishNode(start, {
            type: 'FlowNullableTypeAnnotation',
            typeAnnotation: parseFlowPrefixType(parser),
        });
    }
    else {
        return parseFlowPostfixType(parser);
    }
}
function parseFlowAnonFunctionWithoutParens(parser) {
    const param = parseFlowPrefixType(parser);
    if (!parser.state.noAnonFunctionType && parser.eat(types_1.types.arrow)) {
        const start = parser.getLoc(param).start;
        const params = [reinterpretTypeAsFlowFunctionTypeParam(parser, param)];
        const returnType = parseFlowType(parser);
        return parser.finishNode(start, {
            type: 'FlowFunctionTypeAnnotation',
            params,
            returnType,
        });
    }
    return param;
}
function parseFlowIntersectionType(parser) {
    const start = parser.getPosition();
    parser.eat(types_1.types.bitwiseAND);
    const type = parseFlowAnonFunctionWithoutParens(parser);
    const types = [type];
    while (parser.eat(types_1.types.bitwiseAND)) {
        types.push(parseFlowAnonFunctionWithoutParens(parser));
    }
    if (types.length === 1) {
        return type;
    }
    else {
        return parser.finishNode(start, {
            type: 'IntersectionTypeAnnotation',
            types,
        });
    }
}
function eatUnionBitwise(parser) {
    if (parser.match(types_1.types.logicalOR)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.CONFUSED_OR,
        });
        parser.next();
    }
    else {
        parser.eat(types_1.types.bitwiseOR);
    }
}
function parseFlowUnionType(parser) {
    const start = parser.getPosition();
    eatUnionBitwise(parser);
    const type = parseFlowIntersectionType(parser);
    const types = [type];
    while (parser.match(types_1.types.logicalOR) || parser.match(types_1.types.bitwiseOR)) {
        eatUnionBitwise(parser);
        types.push(parseFlowIntersectionType(parser));
    }
    if (types.length === 1) {
        return type;
    }
    else {
        return parser.finishNode(start, {
            type: 'UnionTypeAnnotation',
            types,
        });
    }
}
function parseFlowType(parser) {
    parser.pushScope('TYPE', true);
    const type = parseFlowUnionType(parser);
    parser.popScope('TYPE');
    // Ensure that a brace after a function generic type annotation is a
    // statement, except in arrow functions (noAnonFunctionType)
    parser.state.exprAllowed =
        parser.state.exprAllowed || parser.state.noAnonFunctionType;
    return type;
}
function parseFlowTypeAnnotation(parser) {
    const start = parser.getPosition();
    index_1.addFlowDiagnostic(parser, 'type annotation', start);
    return parseFlowTypeInitialiser(parser);
}
exports.parseFlowTypeAnnotation = parseFlowTypeAnnotation;
function parseFlowTypeAnnotatableIdentifier(parser, allowPrimitiveOverride = false) {
    const start = parser.getPosition();
    const ident = allowPrimitiveOverride
        ? index_1.parseBindingIdentifier(parser)
        : parseFlowRestrictedIdentifier(parser);
    let typeAnnotation = undefined;
    if (parser.match(types_1.types.colon)) {
        typeAnnotation = parseFlowTypeAnnotation(parser);
    }
    if (typeAnnotation === undefined) {
        return ident;
    }
    else {
        return parser.finishNode(start, {
            ...ident,
            meta: parser.finishNode(start, { type: 'PatternMeta', typeAnnotation }),
        });
    }
}
function parseFlowClassImplemented(parser) {
    const implemented = [];
    do {
        const start = parser.getPosition();
        const id = parseFlowRestrictedIdentifier(parser, /*liberal*/ true);
        let typeParameters;
        if (parser.isRelational('<')) {
            typeParameters = parseFlowTypeParameterInstantiation(parser);
        }
        implemented.push(parser.finishNode(start, {
            type: 'FlowClassImplements',
            id: index_1.toReferenceIdentifier(parser, id),
            typeParameters,
        }));
    } while (parser.eat(types_1.types.comma));
    return implemented;
}
exports.parseFlowClassImplemented = parseFlowClassImplemented;
function parseFlowVariance(parser) {
    if (parser.match(types_1.types.plusMin)) {
        const start = parser.getPosition();
        index_1.addFlowDiagnostic(parser, 'variance', start);
        let kind;
        if (parser.state.tokenValue === '+') {
            kind = 'plus';
        }
        else {
            kind = 'minus';
        }
        parser.next();
        return parser.finishNode(start, {
            type: 'FlowVariance',
            kind,
        });
    }
    else {
        return undefined;
    }
}
exports.parseFlowVariance = parseFlowVariance;
function parseAsyncArrowWithFlowTypeParameters(parser, startPos) {
    const { params, rest, typeParameters } = index_1.parseFunctionParams(parser);
    const { returnType, valid, predicate } = index_1.parseArrowHead(parser);
    if (!valid) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.FLOW_INVALID_ASYNC_ARROW_WITH_TYPE_PARAMS,
        });
        return undefined;
    }
    const func = index_1.parseArrowExpression(parser, startPos, {
        bindingList: params,
        rest,
    }, 
    /* isAsync */ true);
    return {
        ...func,
        head: {
            ...func.head,
            returnType,
            predicate,
            typeParameters,
        },
    };
}
exports.parseAsyncArrowWithFlowTypeParameters = parseAsyncArrowWithFlowTypeParameters;
function parseFlowObjectTypeInternalSlot(parser, start, isStatic) {
    // Note: both bracketL have already been consumed
    const id = parseFlowObjectPropertyKey(parser);
    parser.expect(types_1.types.bracketR);
    parser.expect(types_1.types.bracketR);
    let optional = false;
    let value;
    if (parser.isRelational('<') || parser.match(types_1.types.parenL)) {
        value = parseFlowObjectTypeMethodish(parser, start);
    }
    else {
        optional = parser.eat(types_1.types.question);
        value = parseFlowTypeInitialiser(parser);
    }
    return parser.finishNode(start, {
        type: 'FlowObjectTypeInternalSlot',
        optional,
        value,
        id,
        static: isStatic,
    });
}
exports.parseFlowObjectTypeInternalSlot = parseFlowObjectTypeInternalSlot;
