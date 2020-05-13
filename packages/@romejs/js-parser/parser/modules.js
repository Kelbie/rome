"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../tokenizer/types");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const index_1 = require("./index");
const diagnostics_1 = require("@romejs/diagnostics");
function parseExport(parser, start) {
    const tsNode = index_1.parseTSExport(parser, start);
    if (tsNode !== undefined) {
        return tsNode;
    }
    let exportKind = 'value';
    let declaration;
    let localSpecifiers;
    // export * from '...'';
    if (shouldParseExportStar(parser)) {
        return parseExportStar(parser, start);
    }
    else if (isExportDefaultSpecifier(parser)) {
        const defStart = parser.getPosition();
        const defExported = index_1.parseIdentifier(parser, true);
        let namedSpecifiers = [];
        let defaultSpecifier = parser.finishNode(defStart, {
            type: 'ExportDefaultSpecifier',
            exported: defExported,
        });
        let namespaceSpecifier;
        if (parser.match(types_1.types.comma) && parser.lookaheadState().tokenType === types_1.types.star) {
            parser.expect(types_1.types.comma);
            const specifierStart = parser.getPosition();
            parser.expect(types_1.types.star);
            parser.expectContextual('as');
            const exported = index_1.parseIdentifier(parser);
            namespaceSpecifier = parser.finishNode(specifierStart, {
                type: 'ExportNamespaceSpecifier',
                exported,
            });
        }
        else {
            namedSpecifiers = parseExportLocalSpecifiersMaybe(parser);
        }
        const source = parseExportFromExpect(parser);
        return createExportExternalDeclaration(parser, start, defaultSpecifier, namespaceSpecifier, namedSpecifiers, source);
    }
    else if (parser.eat(types_1.types._default)) {
        // export default ...
        const declaration = parseExportDefaultExpression(parser);
        checkExport(parser, {
            specifiers: localSpecifiers,
            declaration,
            isDefault: true,
        });
        const node = parser.finishNode(start, {
            type: 'ExportDefaultDeclaration',
            declaration,
        });
        return node;
    }
    else if (shouldParseExportDeclaration(parser)) {
        let source;
        ({
            declaration,
            source,
            localSpecifiers,
            exportKind,
        } = parseExportDeclaration(parser));
        if (source !== undefined) {
            if (declaration !== undefined) {
                throw new Error("When there's a source we don't also expect a declaration");
            }
            return createExportExternalDeclaration(parser, start, undefined, undefined, localSpecifiers === undefined ? [] : localSpecifiers, source, exportKind);
        }
    }
    else if (parser.isContextual('async') &&
        !index_1.isAsyncFunctionDeclarationStart(parser)) {
        const next = parser.lookaheadState();
        parser.addDiagnostic({
            start: next.startPos,
            end: next.endPos,
            description: diagnostics_1.descriptions.JS_PARSER.EXPORT_ASYNC_NO_FUNCTION_KEYWORD,
        });
        declaration = undefined;
        localSpecifiers = [];
    }
    else {
        // export { x, y as z } [from '...']';
        localSpecifiers = parseExportSpecifiers(parser);
        const source = parseExportFrom(parser, false);
        if (source !== undefined) {
            return createExportExternalDeclaration(parser, start, undefined, undefined, localSpecifiers, source);
        }
    }
    checkExport(parser, {
        specifiers: localSpecifiers,
        declaration,
        isDefault: false,
    });
    if (declaration !== undefined) {
        if (declaration.type !== 'VariableDeclarationStatement' &&
            declaration.type !== 'ClassDeclaration' &&
            declaration.type !== 'FunctionDeclaration' &&
            declaration.type !== 'TSModuleDeclaration' &&
            declaration.type !== 'TSEnumDeclaration' &&
            declaration.type !== 'FlowInterfaceDeclaration' &&
            declaration.type !== 'TypeAliasTypeAnnotation' &&
            declaration.type !== 'TSInterfaceDeclaration' &&
            declaration.type !== 'TSDeclareFunction' &&
            declaration.type !== 'FlowOpaqueType') {
            parser.addDiagnostic({
                loc: declaration.loc,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_EXPORT_DECLARATION,
            });
            return declaration;
        }
    }
    const node = parser.finishNode(start, {
        type: 'ExportLocalDeclaration',
        exportKind,
        specifiers: localSpecifiers,
        declaration,
    });
    return node;
}
exports.parseExport = parseExport;
function createExportExternalDeclaration(parser, start, defaultSpecifier, namespaceSpecifier, namedSpecifiers, source, exportKind) {
    checkExport(parser, {
        specifiers: [defaultSpecifier, namespaceSpecifier, ...namedSpecifiers],
        declaration: undefined,
        isDefault: false,
        localIsExternal: true,
    });
    const node = parser.finishNode(start, {
        type: 'ExportExternalDeclaration',
        exportKind,
        source,
        namedSpecifiers: [],
        defaultSpecifier,
        namespaceSpecifier,
    });
    // We convert the specifiers after we've finished the ExportExternalDeclaration node
    // as the comment attachment logic may mess with the specifiers and so we need to
    // clone them after
    return {
        ...node,
        namedSpecifiers: convertLocalToExternalSpecifiers(parser, namedSpecifiers),
    };
}
function convertLocalToExternalSpecifiers(parser, specifiers = []) {
    return specifiers.map((specifier) => {
        return {
            ...specifier,
            type: 'ExportExternalSpecifier',
            local: index_1.toIdentifier(parser, specifier.local),
        };
    });
}
function parseExportDefaultExpression(parser) {
    if (parser.isSyntaxEnabled('ts')) {
        if (index_1.isTSAbstractClass(parser)) {
            const start = parser.getPosition();
            parser.next(); // Skip 'abstract'
            return index_1.parseTSExportDefaultAbstractClass(parser, start);
        }
        if (parser.state.tokenValue === 'interface' && !parser.isLineTerminator()) {
            const start = parser.getPosition();
            parser.next();
            return index_1.parseTSInterfaceDeclaration(parser, start);
        }
    }
    const start = parser.getPosition();
    const isAsync = index_1.isAsyncFunctionDeclarationStart(parser);
    if (parser.eat(types_1.types._function) || isAsync) {
        if (isAsync) {
            parser.eatContextual('async');
            parser.expect(types_1.types._function);
        }
        return index_1.parseExportDefaultFunctionDeclaration(parser, start, isAsync);
    }
    if (parser.match(types_1.types._class)) {
        return index_1.parseExportDefaultClassDeclaration(parser, start);
    }
    if (parser.match(types_1.types._const) || parser.match(types_1.types._var) || index_1.isLetStart(parser)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_EXPORT_DEFAULT,
        });
    }
    const res = index_1.parseMaybeAssign(parser, 'export default declaration');
    parser.semicolon();
    return res;
}
function parseExportDeclaration(parser) {
    if (parser.isContextual('type')) {
        const start = parser.getPosition();
        parser.next();
        if (parser.match(types_1.types.braceL)) {
            // export { foo, bar };
            const specifiers = parseExportSpecifiers(parser);
            const source = parseExportFrom(parser, false);
            return {
                exportKind: 'type',
                localSpecifiers: specifiers,
                source,
            };
        }
        else {
            // export type Foo = Bar;
            return {
                exportKind: 'type',
                declaration: index_1.parseTypeAlias(parser, start),
            };
        }
    }
    if (parser.isContextual('opaque')) {
        const declarationNode = parser.getPosition();
        parser.next();
        // export opaque type Foo = Bar;
        return {
            exportKind: 'type',
            declaration: index_1.parseFlowOpaqueType(parser, declarationNode, false),
        };
    }
    if (parser.isContextual('interface')) {
        const declarationNode = parser.getPosition();
        parser.next();
        return {
            exportKind: 'type',
            declaration: index_1.parseInterface(parser, declarationNode),
        };
    }
    return {
        exportKind: 'value',
        declaration: index_1.parseStatement(parser),
    };
}
function isExportDefaultSpecifier(parser) {
    const lookahead = parser.lookaheadState();
    if (lookahead.tokenType === types_1.types.comma ||
        (lookahead.tokenType === types_1.types.name && lookahead.tokenValue === 'from')) {
        return true;
    }
    if (parser.isSyntaxEnabled('ts') && index_1.isTSDeclarationStart(parser)) {
        return false;
    }
    if (parser.match(types_1.types.name) &&
        (parser.state.tokenValue === 'type' ||
            parser.state.tokenValue === 'interface' ||
            parser.state.tokenValue === 'opaque')) {
        return false;
    }
    if (parser.match(types_1.types.name)) {
        return (parser.state.tokenValue !== 'async' && parser.state.tokenValue !== 'let');
    }
    if (!parser.match(types_1.types._default)) {
        return false;
    }
    return false;
}
function parseExportLocalSpecifiersMaybe(parser) {
    if (parser.eat(types_1.types.comma)) {
        return parseExportSpecifiers(parser);
    }
    else {
        return [];
    }
}
function parseExportFromExpect(parser) {
    // @ts-ignore: `expect` parameter will always return a StringLiteral
    return parseExportFrom(parser, true);
}
function parseExportFrom(parser, expect) {
    let source;
    if (parser.eatContextual('from')) {
        if (parser.match(types_1.types.string)) {
            source = index_1.parseStringLiteral(parser);
        }
        else {
            const expr = index_1.parseExpressionAtom(parser, 'export from');
            parser.addDiagnostic({
                loc: expr.loc,
                description: diagnostics_1.descriptions.JS_PARSER.EXPORT_FROM_NOT_STRING,
            });
            source = {
                type: 'StringLiteral',
                value: '',
                loc: expr.loc,
            };
        }
    }
    else if (expect) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.EXPORT_MISSING_FROM,
        });
        source = {
            type: 'StringLiteral',
            value: '',
            loc: parser.finishLoc(parser.getPosition()),
        };
    }
    parser.semicolon();
    return source;
}
function shouldParseExportStar(parser) {
    return (parser.match(types_1.types.star) ||
        (parser.isContextual('type') &&
            parser.lookaheadState().tokenType === types_1.types.star));
}
function parseExportStar(parser, start) {
    let exportKind;
    if (parser.eatContextual('type')) {
        exportKind = 'type';
    }
    parser.expect(types_1.types.star);
    if (parser.isContextual('as')) {
        const { source, namespaceSpecifier, namedSpecifiers } = parseExportNamespace(parser, exportKind);
        return parser.finishNode(start, {
            type: 'ExportExternalDeclaration',
            namespaceSpecifier,
            exportKind,
            namedSpecifiers,
            source,
        });
    }
    else {
        const source = parseExportFrom(parser, true);
        if (source === undefined) {
            throw new Error('Passed `true` above which expects there to be a string');
        }
        return parser.finishNode(start, {
            type: 'ExportAllDeclaration',
            exportKind,
            source,
        });
    }
}
function parseExportNamespace(parser, exportKind) {
    if (exportKind === 'type') {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.EXPORT_TYPE_NAMESPACE,
        });
    }
    const specifierStart = parser.state.lastStartPos;
    parser.next();
    const exported = index_1.parseIdentifier(parser, true);
    const namespaceSpecifier = parser.finishNode(specifierStart, {
        type: 'ExportNamespaceSpecifier',
        exported,
    });
    const namedSpecifiers = convertLocalToExternalSpecifiers(parser, parseExportLocalSpecifiersMaybe(parser));
    const source = parseExportFromExpect(parser);
    return { source, namespaceSpecifier, namedSpecifiers };
}
function shouldParseExportDeclaration(parser) {
    return (index_1.isTSDeclarationStart(parser) ||
        parser.isContextual('type') ||
        parser.isContextual('interface') ||
        parser.isContextual('opaque') ||
        parser.state.tokenType.keyword === 'var' ||
        parser.state.tokenType.keyword === 'const' ||
        parser.state.tokenType.keyword === 'function' ||
        parser.state.tokenType.keyword === 'class' ||
        index_1.isLetStart(parser) ||
        index_1.isAsyncFunctionDeclarationStart(parser) ||
        parser.match(types_1.types.at));
}
function checkExport(parser, { specifiers, declaration, localIsExternal = false, isDefault = false, }) {
    // Check for duplicate exports
    if (isDefault) {
        // Default exports
        if (declaration !== undefined) {
            checkDuplicateExports(parser, declaration, 'default');
        }
        return undefined;
    }
    if (declaration !== undefined) {
        // Exported declarations
        if (declaration.type === 'FunctionDeclaration') {
            if (declaration.id === undefined) {
                throw new Error('Expected declaration.id');
            }
            checkDuplicateExports(parser, declaration, declaration.id.name);
        }
        if (declaration.type === 'ClassDeclaration') {
            if (declaration.id === undefined) {
                throw new Error('Expected declaration.id');
            }
            checkDuplicateExports(parser, declaration, declaration.id.name);
        }
        if (declaration.type === 'VariableDeclaration') {
            for (const node of js_ast_utils_1.getBindingIdentifiers(declaration)) {
                checkDuplicateExports(parser, node, node.name);
            }
        }
    }
    if (specifiers !== undefined) {
        // Named exports
        for (const specifier of specifiers) {
            if (specifier === undefined) {
                continue;
            }
            checkDuplicateExports(parser, specifier, specifier.exported.name);
            if (specifier.type === 'ExportLocalSpecifier' && !localIsExternal) {
                const { local } = specifier;
                if (local !== undefined) {
                    // check for keywords used as local names
                    index_1.checkReservedWord(parser, local.name, parser.getLoc(local), true, false);
                }
            }
        }
    }
}
function checkDuplicateExports(parser, node, name) {
    if (parser.isSyntaxEnabled('ts')) {
        // Refer to checkReservedWord for an explanation
        return undefined;
    }
    const existing = parser.state.exportedIdentifiers.get(name);
    if (existing !== undefined) {
        parser.addDiagnostic({
            loc: node.loc,
            description: diagnostics_1.descriptions.JS_PARSER.DUPLICATE_EXPORT(name, existing),
        });
    }
    parser.state.exportedIdentifiers.set(name, parser.getLoc(node));
}
// Parses a comma-separated list of module exports.
function parseExportSpecifiers(parser) {
    const specifiers = [];
    let first = true;
    // export { x, y as z } [from '...']';
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'export specifiers');
    while (true) {
        if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (first) {
            first = false;
        }
        else {
            parser.expect(types_1.types.comma);
            if (parser.eat(types_1.types.braceR)) {
                break;
            }
        }
        const start = parser.getPosition();
        const local = index_1.parseReferenceIdentifier(parser, true);
        const exported = parser.eatContextual('as')
            ? index_1.parseIdentifier(parser, true)
            : index_1.toIdentifier(parser, parser.cloneNode(local));
        specifiers.push(parser.finishNode(start, {
            type: 'ExportLocalSpecifier',
            local,
            exported,
        }));
    }
    return specifiers;
}
function parseImport(parser, start) {
    if (parser.match(types_1.types.name) && parser.lookaheadState().tokenType === types_1.types.eq) {
        return index_1.parseTSImportEqualsDeclaration(parser, start);
    }
    let namedSpecifiers = [];
    let namespaceSpecifier;
    let defaultSpecifier;
    let source;
    let importKind;
    // import '...'
    if (parser.match(types_1.types.string)) {
        source = index_1.parseStringLiteral(parser);
    }
    else {
        ({
            namedSpecifiers,
            namespaceSpecifier,
            defaultSpecifier,
            importKind,
        } = parseImportSpecifiers(parser, start));
        if (parser.expectContextual('from') && parser.match(types_1.types.string)) {
            source = index_1.parseStringLiteral(parser);
        }
        else {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.IMPORT_MISSING_SOURCE,
            });
            source = parser.finishNode(start, {
                type: 'StringLiteral',
                value: '',
            });
        }
    }
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'ImportDeclaration',
        namedSpecifiers,
        namespaceSpecifier,
        defaultSpecifier,
        source,
        importKind,
    });
}
exports.parseImport = parseImport;
// eslint-disable-next-line no-unused-vars
function shouldParseDefaultImport(parser, kind) {
    if (index_1.hasTypeImportKind(kind)) {
        return index_1.isMaybeDefaultImport(parser.state);
    }
    else {
        return parser.match(types_1.types.name);
    }
}
function parseImportSpecifierLocal(parser, importKind, contextDescription) {
    const start = parser.getPosition();
    const local = index_1.hasTypeImportKind(importKind)
        ? index_1.parseFlowRestrictedIdentifier(parser, true)
        : index_1.parseBindingIdentifier(parser);
    index_1.checkLVal(parser, local, true, undefined, contextDescription);
    return parser.finishNode(start, {
        type: 'ImportSpecifierLocal',
        name: local,
        importKind,
    });
}
// Parses a comma-separated list of module imports.
function parseImportSpecifiers(parser, start) {
    let importKind = undefined;
    // Ensure that when parsing `import from './type.js` we don't mistakenly think it's an import type';
    // TODO probably need to check for a comma and `as`
    const lh = parser.lookaheadState();
    if (lh.tokenType !== types_1.types.name ||
        (lh.tokenType === types_1.types.name && lh.tokenValue !== 'from')) {
        if (parser.match(types_1.types._typeof)) {
            importKind = 'typeof';
        }
        else if (parser.isContextual('type')) {
            importKind = 'type';
        }
    }
    if (importKind) {
        if (importKind === 'type' && lh.tokenType === types_1.types.star) {
            parser.addDiagnostic({
                start: lh.startPos,
                description: diagnostics_1.descriptions.JS_PARSER.IMPORT_TYPE_STAR,
            });
        }
        if (index_1.isMaybeDefaultImport(lh) ||
            lh.tokenType === types_1.types.braceL ||
            lh.tokenType === types_1.types.star) {
            parser.next();
        }
    }
    let namedSpecifiers = [];
    let namespaceSpecifier;
    let defaultSpecifier;
    let first = true;
    // import defaultObj, { x, y as z } from '...'';
    if (shouldParseDefaultImport(parser, importKind)) {
        const meta = parseImportSpecifierLocal(parser, importKind, 'default import specifier');
        defaultSpecifier = parser.finishNode(start, {
            type: 'ImportDefaultSpecifier',
            local: meta,
        });
        if (!parser.eat(types_1.types.comma)) {
            return {
                namedSpecifiers,
                namespaceSpecifier,
                defaultSpecifier,
                importKind,
            };
        }
    }
    if (parser.match(types_1.types.star)) {
        parser.next();
        parser.expectContextual('as');
        const meta = parseImportSpecifierLocal(parser, importKind, 'import namespace specifier');
        namespaceSpecifier = parser.finishNode(start, {
            type: 'ImportNamespaceSpecifier',
            local: meta,
        });
        return { namedSpecifiers, namespaceSpecifier, defaultSpecifier, importKind };
    }
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'import specifiers');
    while (true) {
        if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (first) {
            first = false;
        }
        else {
            // Detect an attempt to deep destructure
            if (parser.eat(types_1.types.colon)) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.DESTRUCTURING_IN_IMPORT,
                });
            }
            parser.expect(types_1.types.comma);
            if (parser.eat(types_1.types.braceR)) {
                break;
            }
        }
        namedSpecifiers.push(parseImportSpecifier(parser, importKind));
    }
    return { namedSpecifiers, namespaceSpecifier, defaultSpecifier, importKind };
}
function parseImportSpecifier(parser, nodeKind) {
    const start = parser.getPosition();
    const firstIdentPos = parser.state.startPos;
    const firstIdent = index_1.parseIdentifier(parser, true);
    let imported;
    let local;
    let importKind = undefined;
    if (firstIdent.name === 'type') {
        importKind = 'type';
    }
    else if (firstIdent.name === 'typeof') {
        importKind = 'typeof';
    }
    let isBinding = false;
    if (parser.isContextual('as') && !parser.isLookaheadContextual('as')) {
        const asIdent = index_1.parseIdentifier(parser, true);
        if (importKind !== undefined &&
            !parser.match(types_1.types.name) &&
            parser.state.tokenType.keyword === undefined) {
            // `import {type as ,` or `import {type as }`
            imported = asIdent;
            local = index_1.toBindingIdentifier(parser, parser.cloneNode(asIdent));
        }
        else {
            // `import {type as foo`
            imported = firstIdent;
            importKind = undefined;
            local = index_1.parseBindingIdentifier(parser);
        }
    }
    else if (importKind !== undefined &&
        (parser.match(types_1.types.name) || parser.state.tokenType.keyword)) {
        // `import {type foo`
        imported = index_1.parseIdentifier(parser, true);
        if (parser.eatContextual('as')) {
            local = index_1.parseBindingIdentifier(parser);
        }
        else {
            isBinding = true;
            local = index_1.toBindingIdentifier(parser, parser.cloneNode(imported));
        }
    }
    else {
        isBinding = true;
        imported = firstIdent;
        importKind = undefined;
        local = index_1.toBindingIdentifier(parser, parser.cloneNode(imported));
    }
    const nodeIsTypeImport = index_1.hasTypeImportKind(nodeKind);
    const specifierIsTypeImport = index_1.hasTypeImportKind(importKind);
    if (nodeIsTypeImport && specifierIsTypeImport) {
        parser.addDiagnostic({
            start: firstIdentPos,
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_KIND_SPECIFIER_ON_IMPORT_DECLARATION_WITH_KIND,
        });
    }
    const loc = parser.finishLoc(start);
    if (nodeIsTypeImport || specifierIsTypeImport) {
        index_1.checkReservedType(parser, local.name, loc);
    }
    if (isBinding && !nodeIsTypeImport && !specifierIsTypeImport) {
        index_1.checkReservedWord(parser, local.name, loc, true, true);
    }
    index_1.checkLVal(parser, local, true, undefined, 'import specifier');
    return parser.finishNode(start, {
        type: 'ImportSpecifier',
        imported,
        local: parser.finishNode(start, {
            type: 'ImportSpecifierLocal',
            name: local,
            importKind,
        }),
    });
}
