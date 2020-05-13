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
const tokenizer_1 = require("../tokenizer");
function isTypeSystemEnabled(parser) {
    return parser.isSyntaxEnabled('flow') || parser.isSyntaxEnabled('ts');
}
exports.isTypeSystemEnabled = isTypeSystemEnabled;
function parseTypeLiteralAnnotation(parser) {
    const start = parser.getPosition();
    switch (parser.state.tokenType) {
        case types_1.types.string: {
            const value = String(parser.state.tokenValue);
            parser.next();
            return parser.finishNode(start, {
                type: 'StringLiteralTypeAnnotation',
                value,
            });
        }
        case types_1.types.num: {
            const { tokenValue } = parser.state;
            if (!(tokenValue instanceof tokenizer_1.NumberTokenValue)) {
                throw new Error('Expected NumberTokenValue');
            }
            const { value, format } = tokenValue;
            parser.next();
            return parser.finishNode(start, {
                type: 'NumericLiteralTypeAnnotation',
                value,
                format,
            });
        }
        case types_1.types._true:
        case types_1.types._false: {
            const value = parser.match(types_1.types._true);
            parser.next();
            return parser.finishNode(start, {
                type: 'BooleanLiteralTypeAnnotation',
                value,
            });
        }
        case types_1.types.plusMin: {
            const { tokenValue } = parser.state;
            if (tokenValue === '-') {
                parser.next();
                if (!parser.match(types_1.types.num)) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.TYPE_NUMERIC_LITERAL_EXPECTED,
                    });
                    parser.next();
                    return parser.finishNode(start, {
                        type: 'NumericLiteralTypeAnnotation',
                        value: 0,
                    });
                }
                const { tokenValue } = parser.state;
                if (!(tokenValue instanceof tokenizer_1.NumberTokenValue)) {
                    throw new Error('Expected NumberTokenValue');
                }
                const { value, format } = tokenValue;
                parser.next();
                return parser.finishNode(start, {
                    type: 'NumericLiteralTypeAnnotation',
                    value: -value,
                    format,
                });
            }
            else {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.TYPE_NUMERIC_LITERAL_PLUS,
                });
                parser.next();
                if (!parser.match(types_1.types.num)) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.TYPE_NUMERIC_LITERAL_EXPECTED,
                    });
                    parser.next();
                    return parser.finishNode(start, {
                        type: 'NumericLiteralTypeAnnotation',
                        value: 0,
                    });
                }
                return parseTypeLiteralAnnotation(parser);
            }
        }
        default:
            throw new Error('Caller should have already validated the range of token types');
    }
}
exports.parseTypeLiteralAnnotation = parseTypeLiteralAnnotation;
function parseFlowOrTS(parser, label, flow, ts) {
    if (parser.isSyntaxEnabled('flow')) {
        return flow(parser);
    }
    else if (parser.isSyntaxEnabled('ts')) {
        return ts(parser);
    }
    else {
        const branches = parser.createBranch();
        // Suppress disabled syntax errors
        parser.syntax.add('flow');
        branches.add(flow);
        parser.syntax.delete('flow');
        // If we parsed this as Flow syntax, then it's definitely valid Flow syntax, but could also be valid TS syntax since sometimes they intersect
        let isFlowOrTS = branches.hasOptimalBranch();
        // Suppress disabled syntax errors
        parser.syntax.add('ts');
        branches.add(ts);
        parser.syntax.delete('ts');
        // If we didn't pick the Flow branch but picked the TS one, then this could only ever be TS syntax
        let isOnlyTS = !isFlowOrTS && branches.hasOptimalBranch();
        const start = parser.getPosition();
        const node = branches.pick();
        if (isOnlyTS) {
            addTSDiagnostic(parser, label, start);
        }
        else {
            addFlowOrTSDiagnostic(parser, label, start);
        }
        return node;
    }
}
function addFlowOrTSDiagnostic(parser, label, start) {
    if (parser.isSyntaxEnabled('ts') || parser.isSyntaxEnabled('flow')) {
        return;
    }
    parser.addDiagnostic({
        start,
        description: diagnostics_1.descriptions.JS_PARSER.FLOW_OR_TEST_REQUIRED(label),
    });
}
exports.addFlowOrTSDiagnostic = addFlowOrTSDiagnostic;
function addFlowDiagnostic(parser, label, start) {
    if (parser.isSyntaxEnabled('flow')) {
        return;
    }
    parser.addDiagnostic({
        start,
        description: diagnostics_1.descriptions.JS_PARSER.FLOW_REQUIRED(label),
    });
}
exports.addFlowDiagnostic = addFlowDiagnostic;
function addTSDiagnostic(parser, label, start) {
    if (parser.isSyntaxEnabled('ts')) {
        return;
    }
    parser.addDiagnostic({
        start,
        description: diagnostics_1.descriptions.JS_PARSER.TS_REQUIRED(label),
    });
}
exports.addTSDiagnostic = addTSDiagnostic;
function parseClassImplements(parser) {
    return parseFlowOrTS(parser, 'class implements', index_1.parseFlowClassImplemented, () => index_1.parseTSHeritageClause(parser, 'implements'));
}
exports.parseClassImplements = parseClassImplements;
function parsePrimaryTypeAnnotation(parser) {
    return parseFlowOrTS(parser, 'type annotation', index_1.parseFlowTypeAnnotation, () => index_1.parseTSTypeAnnotation(parser, true));
}
exports.parsePrimaryTypeAnnotation = parsePrimaryTypeAnnotation;
function parseInterface(parser, start) {
    parser.addDiagnosticFilter({
        message: 'interface is a reserved word',
        start,
    });
    return parseFlowOrTS(parser, 'interface', () => index_1.parseFlowInterface(parser, start), () => index_1.parseTSInterfaceDeclaration(parser, start));
}
exports.parseInterface = parseInterface;
function parseDeclare(parser, start) {
    return parseFlowOrTS(parser, 'type declaration', () => index_1.parseFlowDeclare(parser, start), () => index_1.parseTSDeclare(parser, start));
}
exports.parseDeclare = parseDeclare;
function parseTypeAnnotationAndPredicate(parser) {
    return parseFlowOrTS(parser, 'type annotation and a predicate', () => {
        return index_1.parseFlowTypeAndPredicateInitialiser(parser);
    }, () => {
        return [index_1.parseTSTypeOrTypePredicateAnnotation(parser, types_1.types.colon), undefined];
    });
}
exports.parseTypeAnnotationAndPredicate = parseTypeAnnotationAndPredicate;
function parseTypeAlias(parser, start) {
    return parseFlowOrTS(parser, 'type alias', () => index_1.parseFlowTypeAliasTypeAnnotation(parser, start), () => index_1.parseTSTypeAliasTypeAnnotation(parser, start));
}
exports.parseTypeAlias = parseTypeAlias;
function parseTypeParameters(parser, allowDefault = false) {
    return parseFlowOrTS(parser, 'type parameters', () => index_1.parseFlowTypeParameterDeclaration(parser, allowDefault), index_1.parseTSTypeParameters);
}
exports.parseTypeParameters = parseTypeParameters;
function maybeParseTypeParameters(parser, allowDefault) {
    if (parser.isRelational('<')) {
        return parseTypeParameters(parser, allowDefault);
    }
    else {
        return undefined;
    }
}
exports.maybeParseTypeParameters = maybeParseTypeParameters;
function parseTypeArguments(parser) {
    return parseFlowOrTS(parser, 'type arguments', index_1.parseFlowTypeParameterInstantiation, index_1.parseTSTypeArguments);
}
exports.parseTypeArguments = parseTypeArguments;
function parseTypeCallArguments(parser) {
    return parseFlowOrTS(parser, 'type call arguments', index_1.parseFlowTypeParameterInstantiationCallOrNew, index_1.parseTSTypeArguments);
}
exports.parseTypeCallArguments = parseTypeCallArguments;
function maybeParseTypeArguments(parser) {
    if (parser.isRelational('<')) {
        return parseTypeArguments(parser);
    }
    else {
        return undefined;
    }
}
exports.maybeParseTypeArguments = maybeParseTypeArguments;
function parseTypeExpressionStatement(parser, start, expr) {
    // TODO TypeScript does not like parser.isLineTerminator()
    if (expr.type !== 'ReferenceIdentifier') {
        return undefined;
    }
    // In TS, line breaks aren't allowed between the keyword and the rest of the statement
    // In Flow, they are allowed
    if (parser.isSyntaxEnabled('ts') && parser.hasPrecedingLineBreak()) {
        return undefined;
    }
    switch (expr.name) {
        case 'declare':
            if (parser.match(types_1.types._class) ||
                parser.match(types_1.types.name) ||
                parser.match(types_1.types._function) ||
                parser.match(types_1.types._const) ||
                parser.match(types_1.types._var) ||
                parser.match(types_1.types._export)) {
                return parseDeclare(parser, start);
            }
            else {
                break;
            }
        case 'interface':
            // TODO perform some lookahead to make sure we want to do this
            return parseInterface(parser, start);
        case 'type':
            // TODO perform some lookahead to make sure we want to do this
            return parseTypeAlias(parser, start);
        case 'opaque': {
            // TODO perform some lookahead to make sure we want to do this
            addFlowDiagnostic(parser, 'opaque type', start);
            return index_1.parseFlowOpaqueType(parser, start, false);
        }
        case 'abstract':
            if (parser.match(types_1.types._class)) {
                addTSDiagnostic(parser, 'abstract class', start);
                return index_1.parseTSAbstractClass(parser, start);
            }
            else {
                break;
            }
        case 'enum': {
            if (parser.match(types_1.types.name)) {
                addTSDiagnostic(parser, 'enum declaration', start);
                return index_1.parseTSEnumDeclaration(parser, start, /* isConst */ false);
            }
            else {
                break;
            }
        }
        case 'module':
            if (parser.match(types_1.types.string)) {
                addTSDiagnostic(parser, 'ambient external module declaration', start);
                return index_1.parseTSAmbientExternalModuleDeclaration(parser, start);
            }
            else if (parser.match(types_1.types.name) && !parser.isLineTerminator()) {
                addTSDiagnostic(parser, 'module or namespace declaration', start);
                return index_1.parseTSModuleOrNamespaceDeclaration(parser, start);
            }
            else {
                break;
            }
        case 'namespace': {
            if (!parser.match(types_1.types.name)) {
                return undefined;
            }
            addTSDiagnostic(parser, 'module or namespace declaration', start);
            return index_1.parseTSModuleOrNamespaceDeclaration(parser, start);
        }
        // TODO abstract this into typescript.js
        case 'global':
            // `global { }` (with no `declare`) may appear inside an ambient module declaration.
            // Would like to use parseTSAmbientExternalModuleDeclaration here, but already ran past 'global'.
            if (parser.match(types_1.types.braceL)) {
                addTSDiagnostic(parser, 'module declaration', start);
                const global = true;
                const id = index_1.toBindingIdentifier(parser, expr);
                const body = index_1.parseTSModuleBlock(parser);
                return parser.finishNode(start, {
                    type: 'TSModuleDeclaration',
                    global,
                    id,
                    body,
                });
            }
    }
    return undefined;
}
exports.parseTypeExpressionStatement = parseTypeExpressionStatement;
function ambiguousTypeCastToParameter(parser, node) {
    const start = parser.getPosition();
    const expr = index_1.toTargetAssignmentPattern(parser, node.expression, 'parameter');
    const meta = parser.finishNode(start, {
        type: 'PatternMeta',
        optional: node.optional,
        typeAnnotation: node.typeAnnotation,
    });
    return parser.finishNode(start, {
        ...expr,
        // @ts-ignore
        meta,
    });
}
exports.ambiguousTypeCastToParameter = ambiguousTypeCastToParameter;
