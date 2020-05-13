"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../tokenizer/types");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const charCodes = require("@romejs/string-charcodes");
const index_1 = require("../tokenizer/index");
const index_2 = require("./index");
const ob1_1 = require("@romejs/ob1");
const diagnostics_1 = require("@romejs/diagnostics");
const loopLabel = { kind: 'loop' };
const switchLabel = { kind: 'switch' };
function parseTopLevel(parser) {
    const start = parser.getPosition();
    const openContext = {
        name: 'top-level',
        start,
        indent: ob1_1.ob1Number0,
        open: types_1.types.eof,
        close: types_1.types.eof,
    };
    // Parse the body, and catch fatal syntax errors
    // Get the first token
    index_1.nextToken(parser);
    const interpreter = parsePossibleInterpreterDirective(parser);
    const { body, directives } = parseBlockBody(parser, true, true, openContext);
    return parser.finishNode(start, {
        type: 'Program',
        corrupt: parser.state.corrupt,
        body,
        directives,
        mtime: parser.mtime,
        diagnostics: parser.getDiagnostics(),
        filename: parser.filename,
        comments: parser.state.comments,
        sourceType: parser.sourceType,
        interpreter,
        syntax: Array.from(parser.syntax),
        hasHoistedVars: parser.state.hasHoistedVars,
    });
}
exports.parseTopLevel = parseTopLevel;
function parsePossibleInterpreterDirective(parser) {
    // Check for #!
    if (parser.match(types_1.types.hash) &&
        parser.input[ob1_1.ob1Get0(parser.state.endPos.index)] === '!') {
        // Parse as a regular comment, we should abstract this logic
        // TODO this gets pushed to all the comments which is bad
        const comment = index_1.skipLineComment(parser, 2);
        // Advance to next token
        parser.next();
        return {
            type: 'InterpreterDirective',
            value: comment.value,
            loc: comment.loc,
        };
    }
    else {
        return undefined;
    }
}
exports.parsePossibleInterpreterDirective = parsePossibleInterpreterDirective;
function expressionStatementToDirective(parser, stmt) {
    const expr = stmt.expression;
    const start = parser.getLoc(stmt).start;
    const raw = parser.getRawInput(parser.getLoc(expr).start.index, parser.getLoc(expr).end.index);
    const val = raw.slice(1, -1); // remove quotes
    const end = parser.getLoc(stmt).end;
    return parser.finishNodeAt(start, end, {
        type: 'Directive',
        value: val,
    });
}
exports.expressionStatementToDirective = expressionStatementToDirective;
function isLetStart(parser, context) {
    if (!parser.isContextual('let')) {
        return false;
    }
    js_parser_utils_1.skipWhiteSpace.lastIndex = ob1_1.ob1Get0(parser.state.index);
    const skip = js_parser_utils_1.skipWhiteSpace.exec(parser.input);
    if (skip == null) {
        throw new Error('Should never be true');
    }
    const next = ob1_1.ob1Add(parser.state.index, skip[0].length);
    const nextCh = parser.input.charCodeAt(ob1_1.ob1Get0(next));
    // For ambiguous cases, determine if a LexicalDeclaration (or only a
    // Statement) is allowed here. If context is not empty then only a Statement
    // is allowed. However, `let [` is an explicit negative lookahead for
    // ExpressionStatement, so special-case it first.
    if (nextCh === charCodes.leftSquareBracket) {
        return true;
    }
    if (context !== undefined) {
        return false;
    }
    if (nextCh === charCodes.leftCurlyBrace) {
        return true;
    }
    if (js_parser_utils_1.isIdentifierStart(nextCh)) {
        let pos = ob1_1.ob1Add(next, 1);
        while (js_parser_utils_1.isIdentifierChar(parser.input.charCodeAt(ob1_1.ob1Get0(pos)))) {
            pos = ob1_1.ob1Inc(pos);
        }
        const ident = parser.getRawInput(next, pos);
        if (!js_parser_utils_1.keywordRelationalOperator.test(ident)) {
            return true;
        }
    }
    return false;
}
exports.isLetStart = isLetStart;
// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.
function parseStatement(parser, context = undefined, topLevel = false) {
    let startType = parser.state.tokenType;
    const start = parser.getPosition();
    if (startType === types_1.types._const && parser.isSyntaxEnabled('ts')) {
        const ahead = parser.lookaheadState();
        if (ahead.tokenType === types_1.types.name && ahead.tokenValue === 'enum') {
            parser.expect(types_1.types._const);
            parser.expectContextual('enum');
            return index_2.parseTSEnumDeclaration(parser, start, /* isConst */ true);
        }
    }
    let kind;
    if (isLetStart(parser, context)) {
        startType = types_1.types._var;
        kind = 'let';
    }
    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.
    switch (startType) {
        case types_1.types._break:
            return parseBreakContinueStatement(parser, start, true);
        case types_1.types._continue:
            return parseBreakContinueStatement(parser, start, false);
        case types_1.types._debugger:
            return parseDebuggerStatement(parser, start);
        case types_1.types._do:
            return parseDoStatement(parser, start);
        case types_1.types._for:
            return parseForStatement(parser, start);
        case types_1.types._function: {
            if (parser.lookaheadState().tokenType === types_1.types.dot) {
                // MetaProperty: eg. function.sent
                break;
            }
            if (context !== undefined) {
                if (parser.inScope('STRICT')) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_FUNCTION_IN_STRICT,
                    });
                }
                else if (context !== 'if' && context !== 'label') {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_FUNCTION_IN_NON_STRICT,
                    });
                }
            }
            parser.expect(types_1.types._function);
            const result = parseFunctionDeclaration(parser, start, false);
            if (context !== undefined && result.head.generator === true) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_GENERATOR_DEFINITION,
                    loc: result.loc,
                });
            }
            return result;
        }
        case types_1.types._class: {
            if (context !== undefined) {
                parser.unexpectedToken();
            }
            return index_2.parseClassDeclaration(parser, start);
        }
        case types_1.types._if:
            return parseIfStatement(parser, start);
        case types_1.types._return:
            return parseReturnStatement(parser, start);
        case types_1.types._switch:
            return parseSwitchStatement(parser, start);
        case types_1.types._throw:
            return parseThrowStatement(parser, start);
        case types_1.types._try:
            return parseTryStatement(parser, start);
        case types_1.types._const:
        case types_1.types._var: {
            kind =
                kind === undefined
                    ? assertVarKind(String(parser.state.tokenValue))
                    : kind;
            if (context !== undefined && kind !== 'var') {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.LEXICAL_DECLARATION_IN_SINGLE_STATEMENT_CONTEXT,
                });
            }
            return parseVarStatement(parser, start, kind);
        }
        case types_1.types._while:
            return parseWhileStatement(parser, start);
        case types_1.types._with:
            return parseWithStatement(parser, start);
        case types_1.types.braceL:
            return parseBlock(parser);
        case types_1.types.semi:
            return parseEmptyStatement(parser, start);
        case types_1.types._export:
        case types_1.types._import: {
            const nextToken = parser.lookaheadState();
            if (nextToken.tokenType === types_1.types.parenL || nextToken.tokenType === types_1.types.dot) {
                break;
            }
            parser.next();
            let result;
            if (startType === types_1.types._import) {
                result = index_2.parseImport(parser, start);
            }
            else {
                result = index_2.parseExport(parser, start);
            }
            if (!topLevel) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.IMPORT_EXPORT_MUST_TOP_LEVEL,
                });
            }
            assertModuleNodeAllowed(parser, result);
            return result;
        }
        case types_1.types.name:
            if (isAsyncFunctionDeclarationStart(parser)) {
                if (context !== undefined) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_ASYNC_DEFINITION,
                    });
                }
                // async identifier
                parser.expect(types_1.types.name);
                // function keyword
                parser.expect(types_1.types._function);
                return parseFunctionDeclaration(parser, start, true);
            }
    }
    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
    const maybeName = String(parser.state.tokenValue);
    const expr = index_2.parseExpression(parser, 'statement expression');
    if (startType === types_1.types.name &&
        expr.type === 'ReferenceIdentifier' &&
        parser.eat(types_1.types.colon)) {
        return parseLabeledStatement(parser, start, maybeName, expr, context);
    }
    else {
        return parseExpressionStatement(parser, start, expr);
    }
}
exports.parseStatement = parseStatement;
function isAsyncFunctionDeclarationStart(parser) {
    if (!parser.isContextual('async')) {
        return false;
    }
    const { input } = parser;
    const { index } = parser.state;
    js_parser_utils_1.skipWhiteSpace.lastIndex = ob1_1.ob1Get0(index);
    const skip = js_parser_utils_1.skipWhiteSpace.exec(input);
    if (!skip || skip.length === 0) {
        return false;
    }
    const next = ob1_1.ob1Add(index, skip[0].length);
    return (!js_parser_utils_1.lineBreak.test(parser.getRawInput(index, next)) &&
        parser.getRawInput(next, ob1_1.ob1Add(next, 8)) === 'function' &&
        (ob1_1.ob1Get0(next) + 8 === input.length ||
            !js_parser_utils_1.isIdentifierChar(input.charCodeAt(ob1_1.ob1Get0(next) + 8))));
}
exports.isAsyncFunctionDeclarationStart = isAsyncFunctionDeclarationStart;
function assertModuleNodeAllowed(parser, node) {
    if ((node.type === 'ImportDeclaration' &&
        (node.importKind === 'type' || node.importKind === 'typeof')) ||
        (node.type === 'ExportLocalDeclaration' && node.exportKind === 'type') ||
        (node.type === 'ExportAllDeclaration' && node.exportKind === 'type')) {
        // Allow Flow type imports and exports in all conditions because
        // Flow itself does not care about 'sourceType'.
        return;
    }
    if (!parser.inModule) {
        parser.addDiagnostic({
            loc: node.loc,
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_EXPORT_IN_SCRIPT(parser.options.manifestPath),
        });
    }
}
exports.assertModuleNodeAllowed = assertModuleNodeAllowed;
function parseBreakContinueStatement(parser, start, isBreak) {
    parser.next();
    let label;
    if (parser.isLineTerminator()) {
        label = undefined;
    }
    else if (parser.match(types_1.types.name)) {
        label = index_2.parseIdentifier(parser);
        parser.semicolon();
    }
    else {
        parser.unexpectedToken();
    }
    // Verify that there is an actual destination to break or
    // continue to.
    let i;
    for (i = 0; i < parser.state.labels.length; ++i) {
        const lab = parser.state.labels[i];
        if (label === undefined || lab.name === label.name) {
            if (lab.kind !== undefined && (isBreak || lab.kind === 'loop')) {
                break;
            }
            if (label && isBreak) {
                break;
            }
        }
    }
    if (i === parser.state.labels.length) {
        parser.addDiagnostic({
            start,
            description: diagnostics_1.descriptions.JS_PARSER.UNKNOWN_LABEL(label && label.name),
        });
    }
    if (isBreak) {
        return parser.finishNode(start, {
            type: 'BreakStatement',
            label,
        });
    }
    else {
        return parser.finishNode(start, {
            type: 'ContinueStatement',
            label,
        });
    }
}
exports.parseBreakContinueStatement = parseBreakContinueStatement;
function parseDebuggerStatement(parser, start) {
    parser.next();
    parser.semicolon();
    return parser.finishNode(start, { type: 'DebuggerStatement' });
}
exports.parseDebuggerStatement = parseDebuggerStatement;
function parseDoStatement(parser, start) {
    parser.next();
    parser.state.labels.push(loopLabel);
    const body = parseStatement(parser, 'do');
    parser.state.labels.pop();
    parser.expect(types_1.types._while);
    const test = index_2.parseParenExpression(parser, 'do test');
    parser.eat(types_1.types.semi);
    return parser.finishNode(start, {
        type: 'DoWhileStatement',
        body,
        test,
    });
}
exports.parseDoStatement = parseDoStatement;
function parseForStatement(parser, start) {
    parser.next();
    parser.state.labels.push(loopLabel);
    let awaitAt;
    if (parser.inScope('ASYNC') && parser.eatContextual('await')) {
        awaitAt = parser.getLastEndPosition();
    }
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'for head');
    if (parser.match(types_1.types.semi)) {
        if (awaitAt) {
            parser.unexpectedToken();
        }
        return parseFor(parser, start, openContext, undefined);
    }
    const _isLet = isLetStart(parser);
    if (parser.match(types_1.types._var) || parser.match(types_1.types._const) || _isLet) {
        const initStart = parser.getPosition();
        const kind = assertVarKind(_isLet ? 'let' : String(parser.state.tokenValue));
        parser.next();
        const declarations = parseVar(parser, initStart, kind, true);
        const init = parser.finishNode(initStart, {
            type: 'VariableDeclaration',
            kind,
            declarations,
        });
        if ((parser.match(types_1.types._in) || parser.isContextual('of')) &&
            init.declarations.length === 1) {
            return parseForIn(parser, start, openContext, init, awaitAt);
        }
        if (awaitAt !== undefined) {
            parser.addDiagnostic({
                start: awaitAt,
                description: diagnostics_1.descriptions.JS_PARSER.REGULAR_FOR_AWAIT,
            });
        }
        return parseFor(parser, start, openContext, init);
    }
    const refShorthandDefaultPos = { index: ob1_1.ob1Number0 };
    let init = index_2.parseExpression(parser, 'for init', true, refShorthandDefaultPos);
    if (parser.match(types_1.types._in) || parser.isContextual('of')) {
        const description = parser.isContextual('of')
            ? 'for-of statement'
            : 'for-in statement';
        const initPattern = index_2.toTargetAssignmentPattern(parser, init, description);
        index_2.checkLVal(parser, init, undefined, undefined, description);
        return parseForIn(parser, start, openContext, initPattern, awaitAt);
    }
    if (ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        parser.unexpectedToken(parser.getPositionFromIndex(refShorthandDefaultPos.index));
    }
    if (awaitAt !== undefined) {
        parser.addDiagnostic({
            start: awaitAt,
            description: diagnostics_1.descriptions.JS_PARSER.REGULAR_FOR_AWAIT,
        });
    }
    return parseFor(parser, start, openContext, init);
}
exports.parseForStatement = parseForStatement;
function assertVarKind(kind) {
    if (kind === 'let' || kind === 'var' || kind === 'const') {
        return kind;
    }
    else {
        throw new Error(`Expected valid variable kind but got ${kind}`);
    }
}
exports.assertVarKind = assertVarKind;
function parseIfStatement(parser, start) {
    parser.next();
    const test = index_2.parseParenExpression(parser, 'if test');
    const consequent = parseStatement(parser, 'if');
    const alternate = parser.eat(types_1.types._else)
        ? parseStatement(parser, 'if')
        : undefined;
    return parser.finishNode(start, {
        type: 'IfStatement',
        test,
        consequent,
        alternate,
    });
}
exports.parseIfStatement = parseIfStatement;
function parseReturnStatement(parser, start) {
    if (!parser.inScope('FUNCTION') &&
        parser.sourceType !== 'template' &&
        !parser.options.allowReturnOutsideFunction) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.RETURN_OUTSIDE_FUNCTION,
        });
    }
    parser.next();
    // In `return` (and `break`/`continue`), the keywords with
    // optional arguments, we eagerly look for a semicolon or the
    // possibility to insert one.
    let argument;
    if (!parser.isLineTerminator()) {
        argument = index_2.parseExpression(parser, 'return argument');
        parser.semicolon();
    }
    return parser.finishNode(start, {
        type: 'ReturnStatement',
        argument,
    });
}
exports.parseReturnStatement = parseReturnStatement;
function parseSwitchStatement(parser, start) {
    parser.expect(types_1.types._switch);
    const discriminant = index_2.parseParenExpression(parser, 'switch discriminant');
    const cases = [];
    const hasBrace = parser.match(types_1.types.braceL);
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'switch body');
    parser.state.labels.push(switchLabel);
    if (hasBrace) {
        // Statements under must be grouped (by label) in SwitchCase
        // nodes. `cur` is used to keep the node that we are currently
        // adding statements to.
        let cur;
        function pushCase() {
            if (cur === undefined) {
                return;
            }
            cases.push(parser.finishNode(cur.start, {
                type: 'SwitchCase',
                test: cur.test,
                consequent: cur.consequent,
            }));
            cur = undefined;
        }
        let sawDefault;
        while (true) {
            if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
                break;
            }
            if (parser.match(types_1.types._case) || parser.match(types_1.types._default)) {
                pushCase();
                const isCase = parser.match(types_1.types._case);
                parser.next();
                let test;
                if (isCase) {
                    test = index_2.parseExpression(parser, 'case test');
                }
                else {
                    if (sawDefault) {
                        // TODO point to other default
                        parser.addDiagnostic({
                            start: parser.state.lastStartPos,
                            description: diagnostics_1.descriptions.JS_PARSER.MULTIPLE_DEFAULT_CASE,
                        });
                    }
                    sawDefault = true;
                }
                cur = {
                    start: parser.getPosition(),
                    consequent: [],
                    test,
                };
                parser.expect(types_1.types.colon);
            }
            else {
                const stmt = parseStatement(parser, undefined);
                if (cur === undefined) {
                    parser.addDiagnostic({
                        loc: stmt.loc,
                        description: diagnostics_1.descriptions.JS_PARSER.SWITCH_STATEMENT_OUTSIDE_CASE,
                    });
                }
                else {
                    cur.consequent.push(stmt);
                }
            }
        }
        pushCase();
    }
    parser.expectClosing(openContext);
    parser.state.labels.pop();
    return parser.finishNode(start, {
        type: 'SwitchStatement',
        discriminant,
        cases,
    });
}
exports.parseSwitchStatement = parseSwitchStatement;
function parseThrowStatement(parser, start) {
    parser.next();
    if (js_parser_utils_1.lineBreak.test(parser.getRawInput(parser.state.lastEndPos.index, parser.state.startPos.index))) {
        parser.addDiagnostic({
            start: parser.state.lastEndPos,
            description: diagnostics_1.descriptions.JS_PARSER.NEWLINE_AFTER_THROW,
        });
    }
    const argument = index_2.parseExpression(parser, 'throw argument');
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'ThrowStatement',
        argument,
    });
}
exports.parseThrowStatement = parseThrowStatement;
function parseTryStatement(parser, start) {
    parser.next();
    const block = parseBlock(parser);
    let handler = undefined;
    if (parser.match(types_1.types._catch)) {
        const clauseStart = parser.getPosition();
        parser.next();
        let param;
        if (parser.match(types_1.types.parenL)) {
            const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'catch clause param');
            param = index_2.parseTargetBindingPattern(parser);
            const clashes = new Map();
            index_2.checkLVal(parser, param, true, clashes, 'catch clause');
            parser.expectClosing(openContext);
        }
        const body = parseBlock(parser);
        handler = parser.finishNode(clauseStart, {
            type: 'CatchClause',
            body,
            param,
        });
    }
    const finalizer = parser.eat(types_1.types._finally) ? parseBlock(parser) : undefined;
    if (!handler && !finalizer) {
        parser.addDiagnostic({
            start,
            description: diagnostics_1.descriptions.JS_PARSER.TRY_MISSING_FINALLY_OR_CATCH,
        });
    }
    return parser.finishNode(start, {
        type: 'TryStatement',
        block,
        finalizer,
        handler,
    });
}
exports.parseTryStatement = parseTryStatement;
function parseVarStatement(parser, start, kind) {
    parser.next();
    const declarations = parseVar(parser, start, kind, false);
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'VariableDeclarationStatement',
        declaration: parser.finishNode(start, {
            type: 'VariableDeclaration',
            kind,
            declarations,
        }),
    });
}
exports.parseVarStatement = parseVarStatement;
function parseWhileStatement(parser, start) {
    parser.next();
    const test = index_2.parseParenExpression(parser, 'while test');
    parser.state.labels.push(loopLabel);
    const body = parseStatement(parser, 'while');
    parser.state.labels.pop();
    return parser.finishNode(start, { type: 'WhileStatement', test, body });
}
exports.parseWhileStatement = parseWhileStatement;
function parseWithStatement(parser, start) {
    parser.next();
    const object = index_2.parseParenExpression(parser, 'with object');
    const body = parseStatement(parser, 'with');
    if (parser.inScope('STRICT')) {
        parser.addDiagnostic({
            loc: parser.finishLoc(start),
            description: diagnostics_1.descriptions.JS_PARSER.WITH_IN_STRICT,
        });
    }
    return parser.finishNode(start, {
        type: 'WithStatement',
        object,
        body,
    });
}
exports.parseWithStatement = parseWithStatement;
function parseEmptyStatement(parser, start) {
    parser.next();
    return parser.finishNode(start, { type: 'EmptyStatement' });
}
exports.parseEmptyStatement = parseEmptyStatement;
function parseLabeledStatement(parser, start, maybeName, expr, context) {
    for (const label of parser.state.labels) {
        if (label.name === maybeName) {
            parser.addDiagnostic({
                loc: expr.loc,
                description: diagnostics_1.descriptions.JS_PARSER.DUPLICATE_LABEL(maybeName, label.loc),
            });
        }
    }
    let kind = undefined;
    if (parser.state.tokenType.isLoop) {
        kind = 'loop';
    }
    else if (parser.match(types_1.types._switch)) {
        kind = 'switch';
    }
    for (let i = parser.state.labels.length - 1; i >= 0; i--) {
        const label = parser.state.labels[i];
        if (label.statementStart === start.index) {
            label.statementStart = parser.state.startPos.index;
            label.kind = kind;
        }
        else {
            break;
        }
    }
    parser.state.labels.push({
        name: maybeName,
        kind,
        loc: parser.getLoc(expr),
        statementStart: parser.state.startPos.index,
    });
    let statementContext = 'label';
    if (context !== undefined) {
        if (context.includes('label')) {
            statementContext = context;
        }
        else {
            // @ts-ignore
            statementContext = `${context}label`;
        }
    }
    const body = parseStatement(parser, statementContext);
    if (body.type === 'ClassDeclaration' ||
        (body.type === 'VariableDeclarationStatement' &&
            body.declaration.kind !== 'var') ||
        (body.type === 'FunctionDeclaration' &&
            (parser.inScope('STRICT') ||
                body.head.generator === true ||
                body.head.async === true))) {
        parser.addDiagnostic({
            loc: body.loc,
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_LABEL_DECLARATION,
        });
    }
    parser.state.labels.pop();
    return parser.finishNode(start, {
        type: 'LabeledStatement',
        label: {
            ...expr,
            type: 'Identifier',
        },
        body,
    });
}
exports.parseLabeledStatement = parseLabeledStatement;
function parseExpressionStatement(parser, start, expr) {
    const node = index_2.parseTypeExpressionStatement(parser, start, expr);
    if (node !== undefined) {
        return node;
    }
    parser.semicolon();
    return parser.finishNode(start, {
        type: 'ExpressionStatement',
        expression: expr,
    });
}
exports.parseExpressionStatement = parseExpressionStatement;
function parseBlock(parser, allowDirectives) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'block');
    const { body, directives } = parseBlockBody(parser, allowDirectives, false, openContext);
    return parser.finishNode(start, {
        type: 'BlockStatement',
        directives,
        body,
    });
}
exports.parseBlock = parseBlock;
function isValidDirective(parser, stmt) {
    return (stmt.type === 'ExpressionStatement' &&
        stmt.expression.type === 'StringLiteral' &&
        !parser.isParenthesized(stmt.expression));
}
exports.isValidDirective = isValidDirective;
function parseBlockBody(parser, allowDirectives = false, topLevel, openContext) {
    return parseBlockOrModuleBlockBody(parser, allowDirectives, topLevel, openContext);
}
exports.parseBlockBody = parseBlockBody;
function parseBlockOrModuleBlockBody(parser, allowDirectives, topLevel, openContext) {
    const body = [];
    const directives = [];
    let parsedNonDirective = false;
    let didSetStrict = undefined;
    let octalPosition;
    while (true) {
        if (parser.match(openContext.close) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (!parsedNonDirective && parser.state.containsOctal && !octalPosition) {
            octalPosition = parser.state.octalPosition;
        }
        const stmt = parseStatement(parser, undefined, topLevel);
        if (allowDirectives &&
            !parsedNonDirective &&
            stmt.type === 'ExpressionStatement' &&
            isValidDirective(parser, stmt)) {
            const directive = expressionStatementToDirective(parser, stmt);
            directives.push(directive);
            if (didSetStrict === undefined && directive.value === 'use strict') {
                index_1.setStrict(parser, true);
                didSetStrict = true;
                if (octalPosition !== undefined) {
                    parser.addDiagnostic({
                        index: octalPosition,
                        description: diagnostics_1.descriptions.JS_PARSER.OCTAL_IN_STRICT,
                    });
                }
            }
            continue;
        }
        parsedNonDirective = true;
        body.push(stmt);
    }
    if (didSetStrict) {
        parser.popScope('STRICT');
    }
    return { body, directives };
}
exports.parseBlockOrModuleBlockBody = parseBlockOrModuleBlockBody;
function parseFor(parser, start, openContext, init) {
    parser.expect(types_1.types.semi);
    const test = parser.match(types_1.types.semi)
        ? undefined
        : index_2.parseExpression(parser, 'for test');
    parser.expect(types_1.types.semi);
    const update = parser.match(types_1.types.parenR)
        ? undefined
        : index_2.parseExpression(parser, 'for update');
    parser.expectClosing(openContext);
    const body = parseStatement(parser, 'for');
    parser.state.labels.pop();
    return parser.finishNode(start, {
        type: 'ForStatement',
        init,
        test,
        update,
        body,
    });
}
exports.parseFor = parseFor;
function parseForIn(parser, start, openContext, init, awaitAt) {
    const isForIn = parser.match(types_1.types._in);
    parser.next();
    const isAwait = awaitAt !== undefined;
    if (isForIn && isAwait) {
        parser.addDiagnostic({
            start: awaitAt,
            description: diagnostics_1.descriptions.JS_PARSER.REGULAR_FOR_AWAIT,
        });
    }
    if (init.type === 'VariableDeclaration' &&
        init.declarations[0].init !== undefined &&
        (!isForIn ||
            parser.inScope('STRICT') ||
            init.kind !== 'var' ||
            init.declarations[0].id.type !== 'BindingIdentifier')) {
        parser.addDiagnostic({
            loc: init.loc,
            description: diagnostics_1.descriptions.JS_PARSER.FOR_IN_OF_WITH_INITIALIZER,
        });
    }
    const left = init;
    const right = isForIn
        ? index_2.parseExpression(parser, 'for right')
        : index_2.parseMaybeAssign(parser, 'for right');
    parser.expectClosing(openContext);
    const body = parseStatement(parser, 'for');
    parser.state.labels.pop();
    if (isForIn) {
        const node = parser.finishNode(start, {
            type: 'ForInStatement',
            left,
            right,
            body,
        });
        return node;
    }
    else {
        const node = parser.finishNode(start, {
            type: 'ForOfStatement',
            await: isAwait,
            left,
            right,
            body,
        });
        return node;
    }
}
exports.parseForIn = parseForIn;
function parseVar(parser, start, kind, isFor) {
    const declarations = [];
    while (true) {
        const start = parser.getPosition();
        const id = parseVarHead(parser, start);
        if (kind === 'var') {
            parser.state.hasHoistedVars = true;
        }
        let init;
        if (parser.eat(types_1.types.eq)) {
            init = index_2.parseMaybeAssign(parser, 'var init', isFor);
        }
        else {
            if (kind === 'const' &&
                !(parser.match(types_1.types._in) || parser.isContextual('of'))) {
                // `const` with no initializer is allowed in TypeScript.
                // It could be a declaration like `const x: number;`.
                if (!parser.isSyntaxEnabled('ts')) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.CONST_WITHOUT_INITIALIZER,
                        loc: id.loc,
                    });
                }
            }
            // We exclude `const` because we already validated it above
            if (kind !== 'const' &&
                id.type !== 'BindingIdentifier' &&
                !(isFor && (parser.match(types_1.types._in) || parser.isContextual('of')))) {
                parser.addDiagnostic({
                    start: parser.state.lastEndPos,
                    description: diagnostics_1.descriptions.JS_PARSER.COMPLEX_BINDING_WITHOUT_INITIALIZER,
                });
            }
        }
        declarations.push(parser.finishNode(start, {
            type: 'VariableDeclarator',
            id,
            init,
        }));
        if (!parser.eat(types_1.types.comma)) {
            break;
        }
    }
    return declarations;
}
exports.parseVar = parseVar;
function parseVarHead(parser, start) {
    const id = index_2.parseTargetBindingPattern(parser);
    index_2.checkLVal(parser, id, true, undefined, 'variable declaration');
    let definite;
    if (id.type === 'BindingIdentifier' && parser.match(types_1.types.bang)) {
        definite = true;
        parser.expectSyntaxEnabled('ts');
        parser.next();
    }
    if (parser.match(types_1.types.colon)) {
        const typeAnnotation = index_2.parsePrimaryTypeAnnotation(parser);
        return parser.finishNode(start, {
            ...id,
            meta: parser.finishNode(start, {
                type: 'PatternMeta',
                typeAnnotation,
                definite,
            }),
        });
    }
    else if (definite) {
        return {
            ...id,
            meta: parser.finishNode(start, { type: 'PatternMeta', definite }),
        };
    }
    else {
        return id;
    }
}
exports.parseVarHead = parseVarHead;
function parseFunctionId(parser, requiredStatementId) {
    if (requiredStatementId || parser.match(types_1.types.name)) {
        return index_2.parseBindingIdentifier(parser);
    }
    else {
        return undefined;
    }
}
function parseFunctionDeclaration(parser, start, isAsync) {
    const { id, body, ...shape } = parseFunction(parser, {
        start,
        requiredStatementId: true,
        isStatement: true,
        isAsync,
    });
    if (id === undefined) {
        throw new Error('Required function name');
    }
    if (body === undefined) {
        return parser.finalizeNode({
            type: 'TSDeclareFunction',
            ...shape,
            id,
        });
    }
    return parser.finalizeNode({
        type: 'FunctionDeclaration',
        ...shape,
        id,
        body,
    });
}
exports.parseFunctionDeclaration = parseFunctionDeclaration;
function parseExportDefaultFunctionDeclaration(parser, start, isAsync) {
    let { id, body, ...shape } = parseFunction(parser, {
        start,
        requiredStatementId: false,
        isStatement: true,
        isAsync,
    });
    if (id === undefined) {
        id = {
            type: 'BindingIdentifier',
            name: '*default*',
            // Does this `loc` make sense?
            loc: shape.loc,
        };
    }
    if (body === undefined) {
        return parser.finalizeNode({
            type: 'TSDeclareFunction',
            ...shape,
            id,
        });
    }
    return parser.finalizeNode({
        type: 'FunctionDeclaration',
        ...shape,
        id,
        body,
    });
}
exports.parseExportDefaultFunctionDeclaration = parseExportDefaultFunctionDeclaration;
function parseFunctionExpression(parser, start, isAsync) {
    const { body, ...shape } = parseFunction(parser, {
        start,
        requiredStatementId: false,
        isStatement: false,
        isAsync,
    });
    if (body === undefined) {
        throw new Error('Expected body');
    }
    return {
        ...shape,
        body,
        type: 'FunctionExpression',
    };
}
exports.parseFunctionExpression = parseFunctionExpression;
function parseFunction(parser, opts) {
    const { start, isStatement, requiredStatementId, isAsync } = opts;
    const isGenerator = parser.eat(types_1.types.star);
    let id;
    if (isStatement) {
        id = parseFunctionId(parser, requiredStatementId);
    }
    const oldYieldPos = parser.state.yieldPos;
    const oldAwaitPos = parser.state.awaitPos;
    parser.pushScope('FUNCTION_LOC', start);
    parser.pushScope('FUNCTION', true);
    parser.pushScope('METHOD', false);
    parser.pushScope('GENERATOR', isGenerator);
    parser.pushScope('ASYNC', isAsync);
    parser.pushScope('CLASS_PROPERTY', false);
    parser.pushScope('NON_ARROW_FUNCTION');
    parser.state.yieldPos = ob1_1.ob1Number0;
    parser.state.awaitPos = ob1_1.ob1Number0;
    if (!isStatement) {
        id = parseFunctionId(parser, false);
    }
    const headStart = parser.getPosition();
    const { params, rest, typeParameters } = parseFunctionParams(parser);
    const { head, body } = index_2.parseFunctionBodyAndFinish(parser, {
        allowBodiless: isStatement,
        id,
        params,
        rest,
        isArrowFunction: false,
        isMethod: false,
        isAsync,
        isGenerator,
        headStart,
        start,
    });
    parser.state.yieldPos = oldYieldPos;
    parser.state.awaitPos = oldAwaitPos;
    parser.popScope('NON_ARROW_FUNCTION');
    parser.popScope('FUNCTION');
    parser.popScope('FUNCTION_LOC');
    parser.popScope('CLASS_PROPERTY');
    parser.popScope('METHOD');
    parser.popScope('GENERATOR');
    parser.popScope('ASYNC');
    if (body !== undefined && body.type !== 'BlockStatement') {
        throw new Error('Expected block statement for functions');
    }
    return {
        head: {
            ...head,
            typeParameters,
        },
        body,
        id,
        loc: parser.finishLoc(start),
    };
}
exports.parseFunction = parseFunction;
function splitFunctionParams(params) {
    const firstParam = params[0];
    if (firstParam !== undefined &&
        firstParam.type === 'BindingIdentifier' &&
        firstParam.name === 'this') {
        return {
            thisType: firstParam,
            params: params.slice(1),
        };
    }
    else {
        return {
            thisType: undefined,
            params,
        };
    }
}
exports.splitFunctionParams = splitFunctionParams;
function parseFunctionParams(parser, kind, allowTSModifiers) {
    let typeParameters = undefined;
    if (parser.isRelational('<')) {
        typeParameters = index_2.maybeParseTypeParameters(parser);
        if (typeParameters !== undefined && (kind === 'get' || kind === 'set')) {
            parser.addDiagnostic({
                loc: typeParameters.loc,
                description: diagnostics_1.descriptions.JS_PARSER.ACCESSOR_WITH_TYPE_PARAMS,
            });
        }
    }
    parser.pushScope('PARAMETERS', true);
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'function params');
    const { list: params, rest } = index_2.parseBindingListNonEmpty(parser, openContext, allowTSModifiers);
    parser.popScope('PARAMETERS');
    index_2.checkYieldAwaitInDefaultParams(parser);
    return { params, rest, typeParameters };
}
exports.parseFunctionParams = parseFunctionParams;
