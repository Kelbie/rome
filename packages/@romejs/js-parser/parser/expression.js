"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../tokenizer/index");
const charCodes = require("@romejs/string-charcodes");
const types_1 = require("../tokenizer/types");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const context_1 = require("../tokenizer/context");
const index_2 = require("./index");
const ob1_1 = require("@romejs/ob1");
const statement_1 = require("./statement");
const codec_js_regexp_1 = require("@romejs/codec-js-regexp");
const diagnostics_1 = require("@romejs/diagnostics");
function checkPropClash(parser, prop, props) {
    if (prop.key.type === 'ComputedPropertyKey' || prop.type === 'ObjectMethod') {
        return undefined;
    }
    const key = prop.key.value;
    // We can only check these for collisions since they're statically known
    if (key.type !== 'Identifier' &&
        key.type !== 'StringLiteral' &&
        key.type !== 'NumericLiteral') {
        return;
    }
    // It is either an Identifier or a String/NumericLiteral
    const name = key.type === 'Identifier' ? key.name : String(key.value);
    if (name === '__proto__') {
        if (props.has('proto')) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.PROTO_PROP_REDEFINITION,
                loc: key.loc,
            });
        }
        else {
            props.add('proto');
        }
    }
}
exports.checkPropClash = checkPropClash;
function parseExpression(parser, context, noIn, refShorthandDefaultPos) {
    const startPos = parser.state.startPos;
    const expr = parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos);
    if (parser.match(types_1.types.comma)) {
        let expressions = [expr];
        while (parser.eat(types_1.types.comma)) {
            expressions.push(parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos));
        }
        expressions = index_2.filterSpread(parser, index_2.toReferencedList(parser, expressions));
        return parser.finishNode(startPos, {
            type: 'SequenceExpression',
            expressions,
        });
    }
    return expr;
}
exports.parseExpression = parseExpression;
function parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos, afterLeftParse, refNeedsArrowPos) {
    const branches = parser.createBranch();
    // Try parsing as JSX
    if ((parser.isRelational('<') || parser.match(types_1.types.jsxTagStart)) &&
        parser.shouldTokenizeJSX()) {
        branches.add(() => {
            return _parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos, afterLeftParse, refNeedsArrowPos);
        }, { diagnosticsPriority: 1 });
        // Remove `tc.j_expr` and `tc.j_oTag` from 'context added
        // by parsing `jsxTagStart` to stop the JSX plugin from
        // messing with the tokens
        const cLength = parser.state.context.length;
        if (parser.state.context[cLength - 1] === context_1.types.jsxOpenTag) {
            parser.state.context.length -= 2;
        }
        index_1.finishToken(parser, types_1.types.relational, '<');
    }
    // Try parsing as an arrow function with type parameters
    if (parser.isRelational('<')) {
        branches.add(() => {
            const start = parser.getPosition();
            const typeParameters = index_2.parseTypeParameters(parser);
            const arrowExpression = forwardNoArrowParamsConversionAt(parser, start, () => _parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos, afterLeftParse, refNeedsArrowPos));
            parser.resetStartLocationFromNode(arrowExpression, typeParameters);
            if (arrowExpression.type === 'ArrowFunctionExpression') {
                return {
                    ...arrowExpression,
                    typeParameters,
                };
            }
            else {
                parser.addDiagnostic({
                    loc: typeParameters.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_ARROW_AFTER_TYPE_PARAMS,
                });
                return toReferenceIdentifier(parser, parser.createUnknownIdentifier('type params without arrow function'));
            }
        });
    }
    branches.add(() => {
        return _parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos, afterLeftParse, refNeedsArrowPos);
    });
    // Pick the branch with the least amount of errors
    return branches.pick();
}
exports.parseMaybeAssign = parseMaybeAssign;
function _parseMaybeAssign(parser, context, noIn, refShorthandDefaultPos, afterLeftParse, refNeedsArrowPos) {
    const startPos = parser.state.startPos;
    if (parser.isContextual('yield')) {
        if (parser.inScope('GENERATOR')) {
            let left = parseYield(parser, noIn);
            if (afterLeftParse) {
                left = afterLeftParse(parser, left, startPos);
            }
            return left;
        }
        else {
            // The tokenizer will assume an expression is allowed after
            // `yield`, but this isn't that kind of yield
            parser.state.exprAllowed = false;
        }
    }
    const oldCommaAfterSpreadAt = parser.state.commaAfterSpreadAt;
    parser.state.commaAfterSpreadAt = ob1_1.ob1Number0Neg1;
    let failOnShorthandAssign;
    if (refShorthandDefaultPos) {
        failOnShorthandAssign = false;
    }
    else {
        refShorthandDefaultPos = js_parser_utils_1.createIndexTracker();
        failOnShorthandAssign = true;
    }
    if (parser.match(types_1.types.parenL) || parser.match(types_1.types.name)) {
        parser.state.potentialArrowAt = parser.state.startPos.index;
    }
    let left = parseMaybeConditional(parser, context, noIn, refShorthandDefaultPos, refNeedsArrowPos);
    if (afterLeftParse) {
        left = afterLeftParse(parser, left, startPos);
    }
    if (parser.state.tokenType.isAssign) {
        const operator = String(parser.state.tokenValue);
        const leftPatt = index_2.toAssignmentPattern(parser, left, 'assignment expression');
        // reset because shorthand default was used correctly
        refShorthandDefaultPos.index = ob1_1.ob1Number0;
        index_2.checkLVal(parser, leftPatt, undefined, undefined, 'assignment expression');
        // We should never get patterns here...?
        //if (left.type === 'BindingArrayPattern' || left.type === 'BindingObjectPattern') {
        //  checkCommaAfterRestFromSpread(parser);
        //}
        parser.state.commaAfterSpreadAt = oldCommaAfterSpreadAt;
        parser.next();
        const right = parseMaybeAssign(parser, 'assignment right', noIn);
        return parser.finishNode(startPos, {
            type: 'AssignmentExpression',
            operator,
            left: leftPatt,
            right,
        });
    }
    else if (failOnShorthandAssign && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        parser.unexpectedToken(parser.getPositionFromIndex(refShorthandDefaultPos.index));
    }
    parser.state.commaAfterSpreadAt = oldCommaAfterSpreadAt;
    return left;
}
function parseMaybeConditional(parser, context, noIn, refShorthandDefaultPos, refNeedsArrowPos) {
    const startPos = parser.state.startPos;
    const potentialArrowAt = parser.state.potentialArrowAt;
    const expr = parseExpressionOps(parser, context, noIn, refShorthandDefaultPos);
    if (expr.type === 'ArrowFunctionExpression' &&
        parser.getLoc(expr).start.index === potentialArrowAt) {
        return expr;
    }
    if (refShorthandDefaultPos && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        return expr;
    }
    return parseConditional(parser, expr, noIn, startPos, refNeedsArrowPos);
}
exports.parseMaybeConditional = parseMaybeConditional;
function tryParseConditionalConsequent(parser) {
    const brancher = parser.createBranch();
    brancher.add(() => {
        parser.state.noArrowParamsConversionAt.push(parser.state.startPos.index);
        const consequent = parseMaybeAssign(parser, 'conditional consequent');
        parser.state.noArrowParamsConversionAt.pop();
        return {
            consequent,
            failed: !parser.match(types_1.types.colon),
        };
    });
    return brancher.pick();
}
exports.tryParseConditionalConsequent = tryParseConditionalConsequent;
function parseConditional(parser, expr, noIn, startPos, refNeedsArrowPos) {
    if (!parser.match(types_1.types.question)) {
        return expr;
    }
    // This is to handle a case like this: const foo = (foo?: bar) => {};
    // We'll be called due to the `?`, and we should mark ourselves as an
    // expected arrow function if parsing as a regular conditional fails
    if (refNeedsArrowPos) {
        const branch = parser.createBranch();
        branch.add(() => _parseConditional(parser, expr, noIn, startPos), {
            maxNewDiagnostics: 0,
        });
        if (branch.hasBranch()) {
            return branch.pick();
        }
        else {
            refNeedsArrowPos.index = parser.state.startPos.index;
            return expr;
        }
    }
    parser.expect(types_1.types.question);
    const originalNoArrowAt = parser.state.noArrowAt;
    let { consequent } = tryParseConditionalConsequent(parser);
    parser.state.noArrowAt = originalNoArrowAt;
    if (!parser.eat(types_1.types.colon)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.MISSING_CONDITIONAL_SEPARATOR,
        });
    }
    const alternate = forwardNoArrowParamsConversionAt(parser, startPos, () => parseMaybeAssign(parser, 'conditional alternate', noIn, undefined, undefined, undefined));
    return parser.finishNode(startPos, {
        type: 'ConditionalExpression',
        test: expr,
        consequent,
        alternate,
    });
}
exports.parseConditional = parseConditional;
function forwardNoArrowParamsConversionAt(parser, start, parse) {
    if (parser.state.noArrowParamsConversionAt.includes(start.index)) {
        let result;
        parser.state.noArrowParamsConversionAt.push(parser.state.startPos.index);
        result = parse();
        parser.state.noArrowParamsConversionAt.pop();
        return result;
    }
    else {
        return parse();
    }
}
exports.forwardNoArrowParamsConversionAt = forwardNoArrowParamsConversionAt;
function _parseConditional(parser, expr, noIn, startPos) {
    if (parser.eat(types_1.types.question)) {
        const test = expr;
        const consequent = parseMaybeAssign(parser, 'conditional consequent');
        parser.expect(types_1.types.colon);
        const alternate = parseMaybeAssign(parser, 'conditional alternate', noIn);
        return parser.finishNode(startPos, {
            type: 'ConditionalExpression',
            test,
            consequent,
            alternate,
        });
    }
    return expr;
}
function parseExpressionOps(parser, context, noIn, refShorthandDefaultPos) {
    const startPos = parser.state.startPos;
    const potentialArrowAt = parser.state.potentialArrowAt;
    const expr = parseMaybeUnary(parser, context, refShorthandDefaultPos);
    if (expr.type === 'ArrowFunctionExpression' &&
        parser.getLoc(expr).start.index === potentialArrowAt) {
        return expr;
    }
    if (refShorthandDefaultPos && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        return expr;
    }
    return parseExpressionOp(parser, context, expr, startPos, -1, noIn);
}
exports.parseExpressionOps = parseExpressionOps;
function parseExpressionOp(parser, context, left, leftStartPos, minPrec, noIn = false) {
    if (types_1.types._in.getBinop() > minPrec &&
        !parser.hasPrecedingLineBreak() &&
        parser.isContextual('as')) {
        const _const = index_2.tryTSNextParseConstantContext(parser);
        let typeAnnotation;
        if (_const) {
            index_2.tsCheckLiteralForConstantContext(parser, left);
            typeAnnotation = _const;
        }
        else {
            typeAnnotation = index_2.tsNextThenParseType(parser);
        }
        const node = parser.finishNode(leftStartPos, {
            type: 'TSAsExpression',
            typeAnnotation,
            expression: left,
        });
        return parseExpressionOp(parser, context, node, leftStartPos, minPrec, noIn);
    }
    const prec = parser.state.tokenType.binop;
    if (prec !== undefined && (!noIn || !parser.match(types_1.types._in))) {
        if (prec > minPrec) {
            const operator = String(parser.state.tokenValue);
            if (operator === '**' &&
                left.type === 'UnaryExpression' &&
                !parser.isParenthesized(left)) {
                parser.addDiagnostic({
                    loc: left.argument.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.WRAP_EXPONENTIATION,
                });
            }
            const op = parser.state.tokenType;
            parser.next();
            const startPos = parser.state.startPos;
            const right = parseExpressionOp(parser, context, parseMaybeUnary(parser, context), startPos, op.rightAssociative ? prec - 1 : prec, noIn);
            let node;
            if (operator === '||' || operator === '&&' || operator === '??') {
                node = parser.finishNode(leftStartPos, {
                    type: 'LogicalExpression',
                    left,
                    right,
                    operator,
                });
            }
            else {
                node = parser.finishNode(leftStartPos, {
                    type: 'BinaryExpression',
                    left,
                    right,
                    operator,
                });
            }
            return parseExpressionOp(parser, context, node, leftStartPos, minPrec, noIn);
        }
    }
    return left;
}
exports.parseExpressionOp = parseExpressionOp;
// Parse unary operators, both prefix and postfix.
function parseMaybeUnary(parser, context, refShorthandDefaultPos) {
    if (parser.isSyntaxEnabled('ts') &&
        !parser.isSyntaxEnabled('jsx') &&
        parser.isRelational('<')) {
        return index_2.parseTSTypeAssertion(parser);
    }
    if (parser.isContextual('await') && parser.inScope('ASYNC')) {
        return parseAwait(parser);
    }
    if (parser.state.tokenType.prefix) {
        const start = parser.getPosition();
        const update = parser.match(types_1.types.incDec);
        const operator = String(parser.state.tokenValue);
        const prefix = true;
        parser.next();
        const argument = parseMaybeUnary(parser, context);
        if (refShorthandDefaultPos && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
            parser.unexpectedToken(parser.getPositionFromIndex(refShorthandDefaultPos.index));
        }
        if (update) {
            index_2.checkLVal(parser, argument, undefined, undefined, 'prefix operation');
        }
        else if (parser.inScope('STRICT') && operator === 'delete') {
            if (argument.type === 'ReferenceIdentifier') {
                parser.addDiagnostic({
                    loc: argument.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.DELETE_LOCAL_VARIABLE_IN_STRICT,
                });
            }
            else if (argument.type === 'MemberExpression' &&
                argument.property.value.type === 'PrivateName') {
                parser.addDiagnostic({
                    loc: argument.property.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.DELETE_PRIVATE_FIELD,
                });
            }
        }
        let node;
        if (update) {
            if (operator !== '++' && operator !== '--') {
                throw new Error('Expected ++/-- operator only for UpdateExpression');
            }
            node = parser.finishNode(start, {
                type: 'UpdateExpression',
                argument,
                operator,
                prefix,
            });
        }
        else {
            if (operator === '++' || operator === '--') {
                throw new Error('BinaryExpression cannot have ++/-- operator');
            }
            node = parser.finishNode(start, {
                type: 'UnaryExpression',
                argument,
                operator,
                prefix,
            });
        }
        return node;
    }
    const startPos = parser.state.startPos;
    let expr = parseExpressionWithPossibleSubscripts(parser, context, refShorthandDefaultPos);
    if (refShorthandDefaultPos && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        return expr;
    }
    while (parser.state.tokenType.postfix && !parser.canInsertSemicolon()) {
        const operator = String(parser.state.tokenValue);
        index_2.checkLVal(parser, expr, undefined, undefined, 'postfix operation');
        parser.next();
        const updateNode = parser.finishNode(startPos, {
            type: 'UpdateExpression',
            operator,
            prefix: false,
            argument: expr,
        });
        expr = updateNode;
    }
    return expr;
}
exports.parseMaybeUnary = parseMaybeUnary;
// Parse call, dot, and `[]`-subscript expressions.
function parseExpressionWithPossibleSubscripts(parser, context, refShorthandDefaultPos) {
    const startPos = parser.state.startPos;
    const potentialArrowAt = parser.state.potentialArrowAt;
    const expr = parseExpressionAtom(parser, context, refShorthandDefaultPos);
    if (expr.type === 'ArrowFunctionExpression' &&
        parser.getLoc(expr).start.index === potentialArrowAt) {
        return expr;
    }
    if (refShorthandDefaultPos && ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        return expr;
    }
    return parseSubscripts(parser, expr, startPos);
}
exports.parseExpressionWithPossibleSubscripts = parseExpressionWithPossibleSubscripts;
function parseSubscripts(parser, base, startPos, noCalls) {
    const maybeAsyncArrow = atPossibleAsync(parser, base);
    if (base.type === 'ReferenceIdentifier' &&
        base.name === 'async' &&
        parser.state.noArrowAt.includes(startPos.index)) {
        const argsStart = parser.getPosition();
        const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'call arguments');
        const callee = base;
        const { args } = parseCallExpressionArguments(parser, openContext, false);
        base = parser.finishNodeWithCommentStarts([argsStart, startPos], {
            type: 'CallExpression',
            callee,
            arguments: args,
        });
    }
    else if (base.type === 'ReferenceIdentifier' &&
        base.name === 'async' &&
        parser.isRelational('<')) {
        const branch = parser.createBranch();
        branch.add(() => index_2.parseAsyncArrowWithFlowTypeParameters(parser, startPos));
        branch.add(() => parseExpressionSubscriptsRecursively(parser, base, startPos, noCalls, maybeAsyncArrow));
        return branch.pick();
    }
    return parseExpressionSubscriptsRecursively(parser, base, startPos, noCalls, maybeAsyncArrow);
}
exports.parseSubscripts = parseSubscripts;
function parseExpressionSubscriptsRecursively(parser, base, startPos, noCalls, maybeAsyncArrow) {
    const state = {
        optionalChainMember: false,
        stop: false,
    };
    do {
        base = parseExpressionSubscript(parser, base, startPos, noCalls, state, maybeAsyncArrow);
    } while (!state.stop);
    return base;
}
function parseExpressionSubscript(parser, base, startPos, noCalls = false, state, maybeAsyncArrow) {
    if (!parser.hasPrecedingLineBreak() && parser.match(types_1.types.bang)) {
        parser.state.exprAllowed = false;
        parser.next();
        return parser.finishNode(startPos, {
            type: 'TSNonNullExpression',
            expression: base,
        });
    }
    if (parser.match(types_1.types.questionDot)) {
        state.optionalChainMember = true;
        if (noCalls && parser.lookaheadState().tokenType === types_1.types.parenL) {
            state.stop = true;
            return base;
        }
        parser.next();
        // eg: o.m?.<T>(e);
        if (parser.isRelational('<')) {
            if (noCalls) {
                state.stop = true;
                return base;
            }
            const callee = base;
            const typeArguments = index_2.parseTypeCallArguments(parser);
            const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'call arguments');
            const { args } = parseCallExpressionArguments(parser, openContext, false);
            return parser.finishNode(startPos, {
                type: 'OptionalCallExpression',
                arguments: args,
                callee,
                typeArguments,
            });
        }
        if (parser.match(types_1.types.bracketL)) {
            const propStart = parser.getPosition();
            const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'computed property');
            const object = base;
            const property = parseExpression(parser, 'optional member expression property');
            parser.expectClosing(openContext);
            return parser.finishNode(startPos, {
                type: 'MemberExpression',
                object,
                property: parser.finishNode(propStart, {
                    type: 'ComputedMemberProperty',
                    optional: true,
                    value: property,
                }),
            });
        }
        if (parser.match(types_1.types.parenL)) {
            const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'call arguments');
            const callee = base;
            const { args } = parseCallExpressionArguments(parser, openContext, false);
            return parser.finishNode(startPos, {
                type: 'OptionalCallExpression',
                callee,
                arguments: args,
            });
        }
        const object = base;
        const property = parseIdentifier(parser, true);
        return parser.finishNode(startPos, {
            type: 'MemberExpression',
            object,
            property: {
                type: 'StaticMemberProperty',
                loc: property.loc,
                optional: true,
                value: property,
            },
        });
    }
    if (parser.eat(types_1.types.dot)) {
        const object = base;
        const property = parseMaybePrivateName(parser);
        return parser.finishNode(startPos, {
            type: 'MemberExpression',
            object,
            property: {
                type: 'StaticMemberProperty',
                loc: property.loc,
                value: property,
            },
        });
    }
    if (parser.match(types_1.types.bracketL)) {
        const propStart = parser.getPosition();
        const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'computed property');
        const object = base;
        const property = parseExpression(parser, 'member expression computed property');
        parser.expectClosing(openContext);
        return parser.finishNode(startPos, {
            type: 'MemberExpression',
            object,
            property: parser.finishNode(propStart, {
                type: 'ComputedMemberProperty',
                value: property,
            }),
        });
    }
    // Supports: foo<Foo>(); and foo<Foo>``;
    if (parser.isRelational('<') && index_2.isTypeSystemEnabled(parser)) {
        const possibleCallExpression = parser.tryBranch(() => {
            const typeArguments = index_2.parseTypeCallArguments(parser);
            if (!noCalls && parser.match(types_1.types.parenL)) {
                const argsStart = parser.getPosition();
                const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'call arguments');
                const { args } = parseCallExpressionArguments(parser, openContext, false);
                const node = parser.finishNodeWithCommentStarts([argsStart, startPos], {
                    type: 'CallExpression',
                    arguments: args,
                    callee: base,
                    typeArguments,
                });
                return node;
            }
            if (parser.match(types_1.types.backQuote)) {
                return parseTaggedTemplateExpression(parser, startPos, base, state, typeArguments);
            }
            return undefined;
        });
        if (possibleCallExpression !== undefined) {
            return possibleCallExpression;
        }
    }
    if (!noCalls && parser.match(types_1.types.parenL)) {
        const oldMaybeInArrowParameters = parser.state.maybeInArrowParameters;
        const oldYieldPos = parser.state.yieldPos;
        const oldAwaitPos = parser.state.awaitPos;
        parser.state.maybeInArrowParameters = true;
        parser.state.yieldPos = ob1_1.ob1Number0;
        parser.state.awaitPos = ob1_1.ob1Number0;
        const argsStart = parser.getPosition();
        const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'call arguments');
        const callee = base;
        const oldCommaAfterSpreadAt = parser.state.commaAfterSpreadAt;
        parser.state.commaAfterSpreadAt = ob1_1.ob1Number0Neg1;
        let { args, params } = parseCallExpressionArguments(parser, openContext, maybeAsyncArrow);
        if (maybeAsyncArrow && shouldParseAsyncArrow(parser)) {
            state.stop = true;
            index_2.checkCommaAfterRestFromSpread(parser);
            const node = parseAsyncArrowFromCallExpression(parser, startPos, params === undefined ? args : params);
            checkYieldAwaitInDefaultParams(parser);
            parser.state.yieldPos = oldYieldPos;
            parser.state.awaitPos = oldAwaitPos;
            return node;
        }
        else {
            args = index_2.toReferencedListDeep(parser, args);
            // We keep the old value if it isn't null, for cases like
            //   (x = async(yield)) => {}
            parser.state.yieldPos = oldYieldPos || parser.state.yieldPos;
            parser.state.awaitPos = oldAwaitPos || parser.state.awaitPos;
        }
        parser.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        parser.state.commaAfterSpreadAt = oldCommaAfterSpreadAt;
        return parser.finishNodeWithCommentStarts([argsStart, startPos], {
            type: 'CallExpression',
            callee,
            arguments: args,
        });
    }
    if (parser.match(types_1.types.backQuote)) {
        return parseTaggedTemplateExpression(parser, startPos, base, state);
    }
    state.stop = true;
    return base;
}
exports.parseExpressionSubscript = parseExpressionSubscript;
function parseTaggedTemplateExpression(parser, startPos, tag, state, typeArguments) {
    if (state.optionalChainMember) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.TAGGED_TEMPLATE_IN_OPTIONAL_CHAIN,
        });
    }
    const quasi = parseTemplate(parser, true);
    return parser.finishNode(startPos, {
        type: 'TaggedTemplateExpression',
        tag,
        quasi,
        typeArguments,
    });
}
exports.parseTaggedTemplateExpression = parseTaggedTemplateExpression;
function checkYieldAwaitInDefaultParams(parser) {
    if (ob1_1.ob1Get0(parser.state.yieldPos) > 0 &&
        (parser.state.awaitPos === ob1_1.ob1Number0 ||
            parser.state.yieldPos < parser.state.awaitPos)) {
        parser.addDiagnostic({
            index: parser.state.yieldPos,
            description: diagnostics_1.descriptions.JS_PARSER.YIELD_IN_GENERATOR_PARAMS,
        });
    }
    if (ob1_1.ob1Get0(parser.state.awaitPos) > 0) {
        parser.addDiagnostic({
            index: parser.state.awaitPos,
            description: diagnostics_1.descriptions.JS_PARSER.AWAIT_IN_ASYNC_PARAMS,
        });
    }
}
exports.checkYieldAwaitInDefaultParams = checkYieldAwaitInDefaultParams;
function atPossibleAsync(parser, base) {
    const loc = parser.getLoc(base);
    return (base.type === 'ReferenceIdentifier' &&
        base.name === 'async' &&
        parser.state.lastEndPos.index === loc.end.index &&
        !parser.canInsertSemicolon() &&
        parser.getRawInput(loc.start.index, loc.end.index) === 'async');
}
exports.atPossibleAsync = atPossibleAsync;
function parseCallExpressionArguments(parser, openContext, possibleAsyncArrow, refTrailingCommaPos) {
    let callArgs = [];
    let funcParams = [];
    let innerParenStart;
    let first = true;
    let forceAsyncArrow = false;
    while (true) {
        if (parser.match(openContext.close) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (first) {
            first = false;
        }
        else {
            if (!parser.expect(types_1.types.comma)) {
                break;
            }
            if (parser.eat(openContext.close)) {
                break;
            }
        }
        // we need to make sure that if this is an async arrow functions, that we don't allow inner parens inside the params
        if (parser.match(types_1.types.parenL) && !innerParenStart) {
            innerParenStart = parser.state.startPos;
        }
        const elt = parseCallArgument(parser, 'call expression argument', false, possibleAsyncArrow ? js_parser_utils_1.createIndexTracker() : undefined, possibleAsyncArrow ? js_parser_utils_1.createIndexTracker() : undefined, possibleAsyncArrow ? refTrailingCommaPos : undefined);
        if (elt.type === 'ArrayHole') {
            throw new Error('Expected element');
        }
        if (elt.type === 'AmbiguousFlowTypeCastExpression') {
            if (possibleAsyncArrow) {
                // Definitely needs to be an arrow
                forceAsyncArrow = true;
                if (callArgs.length > 0) {
                    funcParams = callArgs.slice();
                    callArgs = [];
                }
                funcParams.push(elt);
            }
            else {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.CONFUSING_CALL_ARGUMENT,
                    loc: elt.loc,
                });
            }
            continue;
        }
        if (funcParams.length > 0) {
            funcParams.push(elt);
        }
        else {
            callArgs.push(elt);
        }
    }
    if (forceAsyncArrow && !shouldParseAsyncArrow(parser)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_ARROW_AFTER_ASYNC_TYPE_PARAMS,
        });
    }
    // we found an async arrow function so let's not allow any inner parens
    if (possibleAsyncArrow &&
        innerParenStart !== undefined &&
        shouldParseAsyncArrow(parser)) {
        parser.addDiagnostic({
            start: innerParenStart,
            description: diagnostics_1.descriptions.JS_PARSER.PARENTHESIZED_FUNCTION_PARAMS,
        });
    }
    return {
        args: callArgs,
        params: funcParams.length === 0 ? undefined : funcParams,
    };
}
exports.parseCallExpressionArguments = parseCallExpressionArguments;
function shouldParseAsyncArrow(parser) {
    return (parser.match(types_1.types.colon) ||
        (parser.match(types_1.types.arrow) && !parser.canInsertSemicolon()));
}
exports.shouldParseAsyncArrow = shouldParseAsyncArrow;
function parseAsyncArrowFromCallExpression(parser, start, args) {
    let returnType;
    if (parser.match(types_1.types.colon)) {
        const oldNoAnonFunctionType = parser.state.noAnonFunctionType;
        parser.state.noAnonFunctionType = true;
        returnType = index_2.parsePrimaryTypeAnnotation(parser);
        parser.state.noAnonFunctionType = oldNoAnonFunctionType;
    }
    const oldYield = parser.state.yieldInPossibleArrowParameters;
    parser.state.yieldInPossibleArrowParameters = undefined;
    parser.expect(types_1.types.arrow);
    const node = parseArrowExpression(parser, start, {
        assignmentList: args,
    }, true);
    parser.state.yieldInPossibleArrowParameters = oldYield;
    return {
        ...node,
        head: {
            ...node.head,
            returnType,
        },
    };
}
exports.parseAsyncArrowFromCallExpression = parseAsyncArrowFromCallExpression;
// Parse a no-call expression (like argument of `new` or `::` operators).
function parseNoCallExpr(parser, context) {
    const startPos = parser.state.startPos;
    return parseSubscripts(parser, parseExpressionAtom(parser, context), startPos, true);
}
exports.parseNoCallExpr = parseNoCallExpr;
function parseExpressionAtom(parser, context, refShorthandDefaultPos) {
    // If a division operator appears in an expression position, the
    // tokenizer got confused, and we force it to read a regexp instead.
    if (parser.state.tokenType === types_1.types.slash) {
        index_1.readRegexp(parser);
    }
    const canBeArrow = parser.state.potentialArrowAt === parser.state.startPos.index;
    // We don't want to match <! as it's the start of a HTML comment
    if (parser.isRelational('<') &&
        parser.input.charCodeAt(ob1_1.ob1Get0(parser.state.index)) !==
            charCodes.exclamationMark) {
        // In case we encounter an lt token here it will always be the start of
        // jsx as the lt sign is not allowed in places that expect an expression
        index_1.finishToken(parser, types_1.types.jsxTagStart);
        return index_2.parseJSXElement(parser);
    }
    switch (parser.state.tokenType) {
        case types_1.types.jsxTagStart:
            return index_2.parseJSXElement(parser);
        case types_1.types._super:
            return parseSuper(parser);
        case types_1.types._import:
            return parseImportOrMetaProperty(parser);
        case types_1.types._this: {
            const start = parser.getPosition();
            parser.next();
            return parser.finishNode(start, { type: 'ThisExpression' });
        }
        case types_1.types.name: {
            const start = parser.getPosition();
            const containsEsc = parser.state.escapePosition !== undefined;
            const id = parseIdentifier(parser);
            if (!containsEsc &&
                id.name === 'async' &&
                parser.match(types_1.types._function) &&
                !parser.canInsertSemicolon()) {
                parser.next();
                return index_2.parseFunctionExpression(parser, start, true);
            }
            if (canBeArrow &&
                !containsEsc &&
                id.name === 'async' &&
                parser.match(types_1.types.name)) {
                const oldYield = parser.state.yieldInPossibleArrowParameters;
                parser.state.yieldInPossibleArrowParameters = undefined;
                const params = [parseReferenceIdentifier(parser)];
                parser.expect(types_1.types.arrow);
                // let foo = bar => {};
                const node = parseArrowExpression(parser, start, {
                    assignmentList: params,
                }, true);
                parser.state.yieldInPossibleArrowParameters = oldYield;
                return node;
            }
            if (canBeArrow && !parser.canInsertSemicolon() && parser.eat(types_1.types.arrow)) {
                const oldYield = parser.state.yieldInPossibleArrowParameters;
                parser.state.yieldInPossibleArrowParameters = undefined;
                const node = parseArrowExpression(parser, start, {
                    assignmentList: [toReferenceIdentifier(parser, id)],
                });
                parser.state.yieldInPossibleArrowParameters = oldYield;
                return node;
            }
            return toReferenceIdentifier(parser, id);
        }
        case types_1.types._do:
            return parseDoExpression(parser);
        case types_1.types.regexp:
            return parseRegExpLiteral(parser);
        case types_1.types.num:
            return parseNumericLiteral(parser);
        case types_1.types.bigint:
            return parseBigIntLiteral(parser);
        case types_1.types.string:
            return parseStringLiteral(parser);
        case types_1.types._null:
            return parseNullLiteral(parser);
        case types_1.types._true:
        case types_1.types._false:
            return parseBooleanLiteral(parser);
        case types_1.types.parenL:
            return parseParenAndDistinguishExpression(parser, context, canBeArrow);
        case types_1.types.bracketL:
            return parseArrayExpression(parser, refShorthandDefaultPos);
        case types_1.types.braceL:
            return parseObjectExpression(parser, refShorthandDefaultPos);
        case types_1.types._function:
            return parseFunctionExpressionOrMetaProperty(parser);
        case types_1.types._class: {
            const start = parser.getPosition();
            return index_2.parseClassExpression(parser, start);
        }
        case types_1.types._new:
            return parseNew(parser);
        case types_1.types.backQuote:
            return parseTemplate(parser, false);
        default: {
            const start = parser.getPosition();
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.UNKNOWN_EXPRESSION_ATOM_START(context),
            });
            parser.next();
            return toReferenceIdentifier(parser, parser.createUnknownIdentifier(context, start));
        }
    }
}
exports.parseExpressionAtom = parseExpressionAtom;
function parseBooleanLiteral(parser) {
    const start = parser.getPosition();
    const value = parser.match(types_1.types._true);
    parser.next();
    return parser.finishNode(start, {
        type: 'BooleanLiteral',
        value,
    });
}
exports.parseBooleanLiteral = parseBooleanLiteral;
function parseMaybePrivateName(parser) {
    const isPrivate = parser.match(types_1.types.hash);
    if (isPrivate) {
        const start = parser.getPosition();
        parser.next();
        parser.assertNoSpace(diagnostics_1.descriptions.JS_PARSER.SPACE_BETWEEN_PRIVATE_HASH);
        const id = parseIdentifier(parser, true);
        return parser.finishNode(start, {
            type: 'PrivateName',
            id,
        });
    }
    else {
        return parseIdentifier(parser, true);
    }
}
exports.parseMaybePrivateName = parseMaybePrivateName;
function parseFunctionExpressionOrMetaProperty(parser) {
    const start = parser.getPosition();
    parser.next();
    // We do not do parseIdentifier here because when parseFunctionExpressionOrMetaProperty
    // is called we already know that the current token is a "name" with the value "function"
    // This will improve perf a tiny little bit as we do not do validation but more importantly
    // here is that parseIdentifier will remove an item from the expression stack
    // if "function" or "class" is parsed as identifier (in objects e.g.), which should not happen here.
    const meta = createIdentifier(parser, start, 'function');
    if (parser.inScope('GENERATOR') && parser.eat(types_1.types.dot)) {
        return parseMetaProperty(parser, start, meta, 'sent');
    }
    const node = index_2.parseFunctionExpression(parser, start, false);
    if (node.type !== 'FunctionExpression') {
        throw new Error('Expected parseFunction to return a FunctionExpression');
    }
    return node;
}
exports.parseFunctionExpressionOrMetaProperty = parseFunctionExpressionOrMetaProperty;
function parseMetaProperty(parser, start, meta, propertyName) {
    if (meta.name === 'function' &&
        propertyName === 'sent' &&
        !parser.isContextual(propertyName)) {
        // They didn't actually say `function.sent`, just `function.`, so a simple error would be less confusing.
        parser.unexpectedToken();
    }
    const escapePosition = parser.state.escapePosition;
    const property = parseIdentifier(parser, true);
    if (property.name === propertyName) {
        parser.banUnicodeEscape(escapePosition, propertyName);
    }
    else {
        parser.addDiagnostic({
            loc: property.loc,
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_META_PROPERTY(meta.name, propertyName),
        });
    }
    return parser.finishNode(start, {
        type: 'MetaProperty',
        meta,
        property,
    });
}
exports.parseMetaProperty = parseMetaProperty;
function parseImportMetaProperty(parser) {
    const start = parser.getPosition();
    const id = parseIdentifier(parser, true);
    parser.expect(types_1.types.dot);
    const node = parseMetaProperty(parser, start, id, 'meta');
    if (!parser.inModule) {
        parser.addDiagnostic({
            loc: node.loc,
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_META_OUTSIDE_MODULE,
        });
    }
    return node;
}
exports.parseImportMetaProperty = parseImportMetaProperty;
function parseParenExpression(parser, context) {
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, context);
    const val = parseExpression(parser, context);
    parser.expectClosing(openContext);
    return val;
}
exports.parseParenExpression = parseParenExpression;
function parseParenAndDistinguishExpression(parser, context, canBeArrow) {
    if (parser.state.noArrowAt.includes(parser.state.startPos.index)) {
        canBeArrow = false;
    }
    const startPos = parser.state.startPos;
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'paren expression');
    const oldMaybeInArrowParameters = parser.state.maybeInArrowParameters;
    const oldYieldPos = parser.state.yieldPos;
    const oldAwaitPos = parser.state.awaitPos;
    const oldYield = parser.state.yieldInPossibleArrowParameters;
    parser.state.maybeInArrowParameters = true;
    parser.state.yieldInPossibleArrowParameters = undefined;
    parser.state.yieldPos = ob1_1.ob1Number0;
    parser.state.awaitPos = ob1_1.ob1Number0;
    const innerStart = parser.getPosition();
    const exprList = [];
    const refShorthandDefaultPos = js_parser_utils_1.createIndexTracker();
    const refNeedsArrowPos = js_parser_utils_1.createIndexTracker();
    let first = true;
    let spreadStart;
    let optionalCommaStart;
    while (!parser.match(types_1.types.parenR)) {
        if (first) {
            first = false;
        }
        else {
            if (!parser.expect(types_1.types.comma, refNeedsArrowPos.index === ob1_1.ob1Number0
                ? undefined
                : parser.getPositionFromIndex(refNeedsArrowPos.index))) {
                break;
            }
            if (parser.match(types_1.types.parenR)) {
                optionalCommaStart = parser.state.startPos;
                break;
            }
        }
        if (parser.match(types_1.types.ellipsis)) {
            const spreadNodeStartPos = parser.state.startPos;
            spreadStart = parser.state.startPos;
            exprList.push(parseParenItem(parser, index_2.parseSpread(parser), spreadNodeStartPos));
            if (parser.match(types_1.types.comma) &&
                parser.lookaheadState().tokenType === types_1.types.parenR) {
                index_2.raiseRestNotLast(parser);
                parser.eat(types_1.types.comma);
            }
        }
        else {
            exprList.push(parseMaybeAssign(parser, context, false, refShorthandDefaultPos, parseParenItem, refNeedsArrowPos));
        }
    }
    const innerEnd = parser.getPosition();
    parser.expectClosing(openContext);
    parser.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    const arrowStart = startPos;
    if (canBeArrow && shouldParseArrow(parser)) {
        const { valid, returnType, predicate } = parseArrowHead(parser);
        if (valid) {
            checkYieldAwaitInDefaultParams(parser);
            parser.state.yieldPos = oldYieldPos;
            parser.state.awaitPos = oldAwaitPos;
            for (const param of exprList) {
                if (parser.isParenthesized(param)) {
                    parser.addDiagnostic({
                        loc: param.loc,
                        description: diagnostics_1.descriptions.JS_PARSER.PARENTHESIZED_FUNCTION_PARAMS,
                    });
                }
            }
            const arrow = parseArrowExpression(parser, arrowStart, {
                assignmentList: exprList,
            });
            parser.state.yieldInPossibleArrowParameters = oldYield;
            return {
                ...arrow,
                head: {
                    ...arrow.head,
                    predicate,
                    returnType,
                },
            };
        }
    }
    parser.state.yieldInPossibleArrowParameters = oldYield;
    // We keep the old value if it isn't null, for cases like
    //   (x = (yield)) => {}
    parser.state.yieldPos = oldYieldPos || parser.state.yieldPos;
    parser.state.awaitPos = oldAwaitPos || parser.state.awaitPos;
    if (exprList.length === 0) {
        parser.addDiagnostic({
            start: innerStart,
            end: innerEnd,
            description: diagnostics_1.descriptions.JS_PARSER.EMPTY_PARENTHESIZED_EXPRESSION,
        });
        exprList.push(toReferenceIdentifier(parser, parser.createUnknownIdentifier('empty parenthesized expression', innerStart, innerEnd)));
    }
    if (optionalCommaStart !== undefined) {
        parser.unexpectedToken(optionalCommaStart);
    }
    if (spreadStart !== undefined) {
        parser.unexpectedToken(spreadStart);
    }
    if (ob1_1.ob1Get0(refShorthandDefaultPos.index) > 0) {
        parser.unexpectedToken(parser.getPositionFromIndex(refShorthandDefaultPos.index));
    }
    if (ob1_1.ob1Get0(refNeedsArrowPos.index) > 0) {
        parser.unexpectedToken(parser.getPositionFromIndex(refNeedsArrowPos.index));
    }
    const filterList = index_2.filterSpread(parser, index_2.toReferencedListDeep(parser, exprList, /* isParenthesizedExpr */ true));
    let val = filterList[0];
    if (filterList.length > 1) {
        val = parser.finishNodeAt(innerStart, innerEnd, {
            type: 'SequenceExpression',
            expressions: filterList,
        });
    }
    parser.addParenthesized(val);
    return val;
}
exports.parseParenAndDistinguishExpression = parseParenAndDistinguishExpression;
function shouldParseArrow(parser) {
    return parser.match(types_1.types.colon) || !parser.canInsertSemicolon();
}
exports.shouldParseArrow = shouldParseArrow;
function parseArrowHead(parser) {
    if (parser.match(types_1.types.colon)) {
        const oldNoAnonFunctionType = parser.state.noAnonFunctionType;
        parser.state.noAnonFunctionType = true;
        const branch = parser.createBranch();
        branch.add(() => {
            const res = index_2.parseTypeAnnotationAndPredicate(parser);
            if (parser.canInsertSemicolon()) {
                // No semicolon insertion expected
                return undefined;
            }
            if (parser.eat(types_1.types.arrow)) {
                return res;
            }
            return undefined;
        });
        if (branch.hasBranch()) {
            const typeInfo = branch.pick();
            parser.state.noAnonFunctionType = oldNoAnonFunctionType;
            if (typeInfo === undefined) {
                throw new Error('hasBranchResult call above should have refined this condition');
            }
            return {
                valid: true,
                predicate: typeInfo[1],
                returnType: typeInfo[0],
            };
        }
        else {
            parser.state.noAnonFunctionType = oldNoAnonFunctionType;
            return {
                valid: false,
                predicate: undefined,
                returnType: undefined,
            };
        }
    }
    else {
        return {
            valid: parser.eat(types_1.types.arrow),
            predicate: undefined,
            returnType: undefined,
        };
    }
}
exports.parseArrowHead = parseArrowHead;
// Parse a possible function param or call argument
function parseParenItem(parser, node, startPos) {
    let optional = undefined;
    if (parser.eat(types_1.types.question)) {
        optional = true;
    }
    if (parser.match(types_1.types.colon)) {
        const typeAnnotation = index_2.parsePrimaryTypeAnnotation(parser);
        return parser.finishNode(startPos, {
            type: 'AmbiguousFlowTypeCastExpression',
            expression: node,
            typeAnnotation,
            optional,
        });
    }
    if (optional) {
        return parser.finishNode(startPos, {
            type: 'AmbiguousFlowTypeCastExpression',
            expression: node,
            typeAnnotation: undefined,
            optional,
        });
    }
    return node;
}
exports.parseParenItem = parseParenItem;
function parseNew(parser) {
    const start = parser.getPosition();
    const meta = parseIdentifier(parser, true);
    if (parser.eat(types_1.types.dot)) {
        const metaProp = parseMetaProperty(parser, start, meta, 'target');
        if (!parser.inScope('NON_ARROW_FUNCTION') &&
            !parser.inScope('CLASS_PROPERTY')) {
            parser.addDiagnostic({
                loc: metaProp.loc,
                description: diagnostics_1.descriptions.JS_PARSER.NEW_TARGET_OUTSIDE_CLASS,
            });
        }
        return metaProp;
    }
    const callee = parseNoCallExpr(parser, 'new callee');
    if (callee.type === 'ImportCall') {
        parser.addDiagnostic({
            loc: callee.loc,
            description: diagnostics_1.descriptions.JS_PARSER.SUPER_OUTSIDE_METHOD,
        });
    }
    const optionalMember = getFirstOptionalChainMember(callee);
    if (optionalMember !== undefined) {
        const memberLoc = parser.getLoc(optionalMember);
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.NEW_IN_OPTIONAL_CHAIN(memberLoc),
        });
    }
    if (parser.eat(types_1.types.questionDot)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.NEW_IN_OPTIONAL_CHAIN(),
        });
    }
    let optional = undefined;
    if (parser.eat(types_1.types.questionDot)) {
        optional = true;
    }
    let typeArguments = undefined;
    if (index_2.isTypeSystemEnabled(parser) && parser.isRelational('<')) {
        typeArguments = parser.tryBranch(index_2.parseTypeCallArguments);
    }
    let args = [];
    if (parser.match(types_1.types.parenL)) {
        const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'new argument');
        args = parseExpressionListNonEmpty(parser, 'new expression argument', openContext);
        args = index_2.toReferencedList(parser, args);
    }
    else if (parser.isSyntaxEnabled('ts') && typeArguments !== undefined) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.NEW_WITH_TYPESCRIPT_TYPE_ARGUMENTS_NO_PARENS,
        });
    }
    return parser.finishNode(start, {
        type: 'NewExpression',
        callee,
        typeArguments,
        arguments: args,
        optional,
    });
}
exports.parseNew = parseNew;
function getFirstOptionalChainMember(node) {
    if (node.type === 'OptionalCallExpression') {
        return node;
    }
    if (node.type === 'MemberExpression') {
        if (node.property.optional) {
            return node;
        }
        if (node.property.type === 'StaticMemberProperty') {
            return getFirstOptionalChainMember(node.object);
        }
    }
    return undefined;
}
// Parse template expression.
function parseTemplateElement(parser, isTagged) {
    const start = parser.getPosition();
    const tokenValue = parser.state.tokenValue;
    if (tokenValue === undefined) {
        if (isTagged) {
            parser.state.invalidTemplateEscapePosition = undefined;
        }
        else {
            parser.addDiagnostic({
                index: parser.state.invalidTemplateEscapePosition,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_TEMPLATE_ESCAPE,
            });
        }
    }
    const raw = parser.getRawInput(parser.state.startPos.index, parser.state.endPos.index).replace(/\r\n?/g, '\n');
    const cooked = tokenValue === undefined ? raw : String(tokenValue);
    parser.next();
    const tail = parser.match(types_1.types.backQuote);
    return parser.finishNode(start, {
        type: 'TemplateElement',
        raw,
        cooked,
        tail,
    });
}
exports.parseTemplateElement = parseTemplateElement;
function parseTemplate(parser, isTagged) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.backQuote, types_1.types.backQuote, 'template literal');
    const expressions = [];
    let curElt = parseTemplateElement(parser, isTagged);
    const quasis = [curElt];
    while (true) {
        if (parser.match(types_1.types.eof) || curElt.tail === true) {
            break;
        }
        const exprPpenContext = parser.expectOpening(types_1.types.dollarBraceL, types_1.types.braceR, 'template expression value');
        expressions.push(parseExpression(parser, 'template expression value'));
        parser.expectClosing(exprPpenContext);
        curElt = parseTemplateElement(parser, isTagged);
        quasis.push(curElt);
    }
    parser.expectClosing(openContext);
    return parser.finishNode(start, {
        type: 'TemplateLiteral',
        expressions,
        quasis,
    });
}
exports.parseTemplate = parseTemplate;
function parseObjectExpression(parser, refShorthandDefaultPos) {
    const propHash = new Set();
    let first = true;
    const start = parser.getPosition();
    const properties = [];
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'object');
    while (true) {
        if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
            parser.expectClosing(openContext);
            break;
        }
        if (first) {
            first = false;
        }
        else {
            if (!parser.expect(types_1.types.comma)) {
                break;
            }
            if (parser.eat(types_1.types.braceR)) {
                break;
            }
        }
        if (parser.match(types_1.types.ellipsis)) {
            const prop = {
                ...index_2.parseSpread(parser),
                type: 'SpreadProperty',
            };
            properties.push(prop);
            continue;
        }
        const start = parser.getPosition();
        let isGenerator = parser.eat(types_1.types.star);
        let isAsync = false;
        let key;
        let escapePosition;
        if (parser.isContextual('async')) {
            if (isGenerator) {
                parser.unexpectedToken();
            }
            const asyncId = parseIdentifier(parser);
            if (parser.match(types_1.types.colon) ||
                parser.match(types_1.types.parenL) ||
                parser.match(types_1.types.braceR) ||
                parser.match(types_1.types.eq) ||
                parser.match(types_1.types.comma)) {
                key = {
                    type: 'StaticPropertyKey',
                    loc: asyncId.loc,
                    value: asyncId,
                };
            }
            else {
                if (parser.hasPrecedingLineBreak()) {
                    parser.addDiagnostic({
                        description: diagnostics_1.descriptions.JS_PARSER.ASYNC_OBJECT_METHOD_LINE_BREAK,
                    });
                }
                isAsync = true;
                if (parser.match(types_1.types.star)) {
                    parser.next();
                    isGenerator = true;
                }
                escapePosition = parser.state.escapePosition;
                key = parseObjectPropertyKey(parser);
            }
        }
        else {
            escapePosition = parser.state.escapePosition;
            key = parseObjectPropertyKey(parser);
        }
        const prop = parseObjectPropertyValue(parser, {
            key,
            start,
            isGenerator,
            isAsync,
            isPattern: false,
            refShorthandDefaultPos,
            escapePosition,
        });
        if (prop === undefined) {
            continue;
        }
        if (prop.type === 'BindingObjectPatternProperty') {
            throw new Error('Impossible');
        }
        checkPropClash(parser, prop, propHash);
        properties.push(prop);
    }
    return parser.finishNode(start, {
        type: 'ObjectExpression',
        properties,
    });
}
exports.parseObjectExpression = parseObjectExpression;
function parseObjectPattern(parser, refShorthandDefaultPos) {
    const propHash = new Set();
    let first = true;
    const start = parser.getPosition();
    const properties = [];
    let rest;
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'object pattern');
    let firstRestLocation = undefined;
    while (true) {
        if (parser.match(types_1.types.eof) || parser.match(types_1.types.braceR)) {
            break;
        }
        if (first) {
            first = false;
        }
        else {
            parser.expect(types_1.types.comma);
            if (parser.match(types_1.types.eof) || parser.match(types_1.types.braceR)) {
                break;
            }
        }
        let isGenerator = false;
        let isAsync = false;
        let start = parser.getPosition();
        if (parser.eat(types_1.types.ellipsis)) {
            const argument = parseBindingIdentifier(parser);
            rest = argument;
            if (firstRestLocation !== undefined) {
                parser.addDiagnostic({
                    loc: argument.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.MULTIPLE_DESTRUCTURING_RESTS,
                });
            }
            if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
                break;
            }
            if (parser.match(types_1.types.comma) &&
                parser.lookaheadState().tokenType === types_1.types.braceR) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.TRAILING_COMMA_AFTER_REST,
                });
                parser.eat(types_1.types.comma);
                break;
            }
            else {
                firstRestLocation = argument.loc;
                continue;
            }
        }
        start = parser.getPosition();
        const key = parseObjectPropertyKey(parser);
        const prop = parseObjectPropertyValue(parser, {
            key,
            start,
            isGenerator,
            isAsync,
            isPattern: true,
            refShorthandDefaultPos,
            escapePosition: undefined,
        });
        if (prop === undefined) {
            continue;
        }
        checkPropClash(parser, prop, propHash);
        if (prop.type !== 'BindingObjectPatternProperty') {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_OBJECT_PATTERN_PROP,
                loc: prop.loc,
            });
            continue;
        }
        properties.push(prop);
    }
    parser.expectClosing(openContext);
    if (firstRestLocation !== undefined) {
        index_2.raiseRestNotLast(parser, firstRestLocation);
    }
    return parser.finishNode(start, {
        type: 'BindingObjectPattern',
        properties,
        rest,
    });
}
exports.parseObjectPattern = parseObjectPattern;
function isGetterOrSetterMethod(parser, key, 
// `key` is always from `name.key`, we just need it here to refine
keyVal, isPattern) {
    return (!isPattern &&
        key.type === 'StaticPropertyKey' &&
        keyVal.type === 'Identifier' &&
        (keyVal.name === 'get' || keyVal.name === 'set') &&
        (parser.match(types_1.types.string) ||
            // get "string"() {}
            parser.match(types_1.types.num) ||
            // get 1() {}
            parser.match(types_1.types.bracketL) ||
            // get ["string"]() {}
            parser.match(types_1.types.name) ||
            // get foo() {}
            !!parser.state.tokenType.keyword) // get debugger() {}
    );
}
exports.isGetterOrSetterMethod = isGetterOrSetterMethod;
// get methods aren't allowed to have any parameters
// set methods must have exactly 1 parameter
function checkGetterSetterParamCount(parser, method, kind) {
    const head = method.type === 'FlowFunctionTypeAnnotation' ? method : method.head;
    if (kind === 'get') {
        if (head.rest !== undefined || head.params.length !== 0) {
            parser.addDiagnostic({
                loc: method.loc,
                description: diagnostics_1.descriptions.JS_PARSER.GETTER_WITH_PARAMS,
            });
        }
    }
    else if (kind === 'set') {
        if (head.rest !== undefined) {
            parser.addDiagnostic({
                loc: head.rest.loc,
                description: diagnostics_1.descriptions.JS_PARSER.SETTER_WITH_REST,
            });
        }
        else if (head.params.length !== 1) {
            parser.addDiagnostic({
                loc: method.loc,
                description: diagnostics_1.descriptions.JS_PARSER.SETTER_NOT_ONE_PARAM,
            });
        }
    }
}
exports.checkGetterSetterParamCount = checkGetterSetterParamCount;
function parseObjectMethod(parser, { key, start, isGenerator, isAsync, isPattern, escapePosition, }) {
    if (isAsync || isGenerator || parser.match(types_1.types.parenL)) {
        if (isPattern) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.OBJECT_METHOD_IN_PATTERN,
            });
        }
        const partial = parseMethod(parser, {
            kind: 'method',
            isClass: false,
            isGenerator,
            isAsync,
            isConstructor: false,
        });
        const { body } = partial;
        if (body === undefined || body.type !== 'BlockStatement') {
            throw new Error('Expected body');
        }
        return parser.finishNode(start, {
            ...partial,
            body,
            key,
            type: 'ObjectMethod',
            kind: 'method',
        });
    }
    if (isGetterOrSetterMethod(parser, key, key.value, isPattern)) {
        if (isAsync) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.ASYNC_GETTER_SETTER,
            });
        }
        if (isGenerator) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.GENERATOR_GETTER_SETTER,
            });
        }
        const kind = key.value.name;
        if (kind !== 'get' && kind !== 'set') {
            throw new Error('Name should be get or set as we already validated it as such');
        }
        parser.banUnicodeEscape(escapePosition, kind);
        const newKey = parseObjectPropertyKey(parser);
        const partial = parseMethod(parser, {
            kind,
            isClass: false,
            isGenerator: false,
            isAsync: false,
            isConstructor: false,
        });
        const { body, head } = partial;
        if (body === undefined || body.type !== 'BlockStatement') {
            throw new Error('Expected body');
        }
        const method = parser.finishNode(start, {
            head,
            body,
            key: newKey,
            type: 'ObjectMethod',
            kind,
        });
        checkGetterSetterParamCount(parser, method, method.kind);
        return method;
    }
    return undefined;
}
exports.parseObjectMethod = parseObjectMethod;
function parseObjectProperty(parser, key, start, isPattern, refShorthandDefaultPos) {
    if (parser.eat(types_1.types.colon)) {
        if (isPattern) {
            const value = index_2.parseMaybeDefault(parser);
            return parser.finishNode(start, {
                key,
                type: 'BindingObjectPatternProperty',
                value,
            });
        }
        else {
            const value = parseMaybeAssign(parser, 'object property value', false, refShorthandDefaultPos);
            return parser.finishNode(start, {
                key,
                type: 'ObjectProperty',
                value,
            });
        }
    }
    if (key.type === 'StaticPropertyKey' && key.value.type === 'Identifier') {
        checkReservedWord(parser, key.value.name, parser.getLoc(key.value), true, true);
        if (isPattern) {
            let value = toBindingIdentifier(parser, parser.cloneNode(key.value));
            if (parser.match(types_1.types.eq) && refShorthandDefaultPos) {
                if (refShorthandDefaultPos.index === ob1_1.ob1Number0) {
                    refShorthandDefaultPos.index = parser.state.startPos.index;
                }
                value = index_2.parseMaybeDefault(parser, start, value);
            }
            return parser.finishNode(start, {
                type: 'BindingObjectPatternProperty',
                key,
                value,
            });
        }
        return parser.finishNode(start, {
            type: 'ObjectProperty',
            key,
            value: toReferenceIdentifier(parser, parser.cloneNode(key.value)),
        });
    }
    return undefined;
}
exports.parseObjectProperty = parseObjectProperty;
function parseObjectPropertyValue(parser, { key, start, isGenerator, isAsync, isPattern, refShorthandDefaultPos, escapePosition, }) {
    if (key.variance !== undefined) {
        parser.addDiagnostic({
            loc: key.variance.loc,
            description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
        });
    }
    // parse type parameters for object method shorthand
    let typeParameters = index_2.maybeParseTypeParameters(parser);
    if (typeParameters !== undefined && !parser.match(types_1.types.parenL)) {
        parser.unexpectedToken();
    }
    let node = parseObjectMethod(parser, {
        key,
        start,
        isGenerator,
        isAsync,
        isPattern,
        escapePosition,
    }) ||
        parseObjectProperty(parser, key, start, isPattern, refShorthandDefaultPos);
    if (node === undefined) {
        parser.unexpectedToken();
        return undefined;
    }
    if (typeParameters === undefined) {
        return node;
    }
    else {
        if (node.type === 'ObjectProperty' ||
            node.type === 'BindingObjectPatternProperty') {
            parser.addDiagnostic({
                loc: typeParameters.loc,
                description: diagnostics_1.descriptions.JS_PARSER.OBJECT_PROPERTY_WITH_TYPE_PARAMETERS,
            });
            return node;
        }
        return {
            ...node,
            head: {
                ...node.head,
                typeParameters,
            },
        };
    }
}
exports.parseObjectPropertyValue = parseObjectPropertyValue;
function parseObjectPropertyKey(parser) {
    const start = parser.getPosition();
    const variance = index_2.parseFlowVariance(parser);
    if (parser.match(types_1.types.bracketL)) {
        const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'property name');
        const value = parseMaybeAssign(parser, 'property name');
        parser.expectClosing(openContext);
        return parser.finishNode(start, {
            type: 'ComputedPropertyKey',
            value,
            variance,
        });
    }
    else {
        parser.pushScope('PROPERTY_NAME', true);
        // We check if it's valid for it to be a private name when we push it.
        let value;
        if (parser.match(types_1.types.num)) {
            value = parseNumericLiteral(parser);
        }
        else if (parser.match(types_1.types.string)) {
            value = parseStringLiteral(parser);
        }
        else {
            value = parseMaybePrivateName(parser);
        }
        parser.popScope('PROPERTY_NAME');
        return parser.finishNode(start, {
            type: 'StaticPropertyKey',
            value,
            variance,
        });
    }
}
exports.parseObjectPropertyKey = parseObjectPropertyKey;
// Parse object or class method.
function parseMethod(parser, opts) {
    const { kind, isClass, isGenerator, isAsync, isConstructor } = opts;
    const oldYieldPos = parser.state.yieldPos;
    const oldAwaitPos = parser.state.awaitPos;
    parser.pushScope('FUNCTION', true);
    parser.pushScope('NON_ARROW_FUNCTION');
    parser.pushScope('METHOD', kind);
    parser.pushScope('GENERATOR', isGenerator);
    parser.state.yieldPos = ob1_1.ob1Number0;
    parser.state.awaitPos = ob1_1.ob1Number0;
    const allowTSModifiers = isConstructor;
    const headStart = parser.getPosition();
    const { typeParameters, rest, params } = index_2.parseFunctionParams(parser, kind, allowTSModifiers);
    const start = parser.getPosition();
    const { body, head } = parseFunctionBodyAndFinish(parser, {
        headStart,
        rest,
        params,
        id: undefined,
        allowBodiless: isClass,
        isArrowFunction: false,
        isAsync,
        isGenerator,
        isMethod: true,
        start,
    });
    parser.popScope('METHOD');
    parser.popScope('GENERATOR');
    parser.popScope('FUNCTION');
    parser.popScope('NON_ARROW_FUNCTION');
    parser.state.yieldPos = oldYieldPos;
    parser.state.awaitPos = oldAwaitPos;
    return {
        head: {
            ...head,
            typeParameters,
        },
        body,
    };
}
exports.parseMethod = parseMethod;
function createFunctionHead(parser, params, rest, opts) {
    const nonRestParams = [];
    for (const param of params) {
        switch (param.type) {
            case 'BindingIdentifier':
            case 'BindingAssignmentPattern':
            case 'BindingObjectPattern':
            case 'BindingArrayPattern': {
                nonRestParams.push(param);
                break;
            }
            default:
                throw new Error('TODO');
        }
    }
    return {
        type: 'FunctionHead',
        rest,
        ...statement_1.splitFunctionParams(nonRestParams),
        ...opts,
    };
}
function parseArrowExpression(parser, start, opts, isAsync = false) {
    // if we got there, it's no more "yield in possible arrow parameters";
    // it's just "yield in arrow parameters"
    if (parser.state.yieldInPossibleArrowParameters) {
        parser.addDiagnostic({
            start: parser.state.yieldInPossibleArrowParameters,
            description: diagnostics_1.descriptions.JS_PARSER.YIELD_NAME_IN_GENERATOR,
        });
    }
    parser.pushScope('FUNCTION', true);
    const oldYieldPos = parser.state.yieldPos;
    const oldAwaitPos = parser.state.awaitPos;
    const oldMaybeInArrowParameters = parser.state.maybeInArrowParameters;
    parser.pushScope('GENERATOR', false);
    parser.state.maybeInArrowParameters = false;
    parser.state.yieldPos = ob1_1.ob1Number0;
    parser.state.awaitPos = ob1_1.ob1Number0;
    const headEnd = parser.getLastEndPosition();
    let params = [];
    let rest = opts.rest;
    if (opts.bindingList !== undefined) {
        params = opts.bindingList;
    }
    if (opts.assignmentList !== undefined) {
        ({ params, rest } = index_2.toFunctionParamsBindingList(parser, opts.assignmentList, 'arrow function parameters'));
    }
    let head = parser.finishNodeAt(start, headEnd, createFunctionHead(parser, params, rest, {
        hasHoistedVars: false,
        async: isAsync,
    }));
    const { body, hasHoistedVars } = parseFunctionBody(parser, {
        id: undefined,
        allowBodiless: false,
        isArrowFunction: true,
        isMethod: false,
        isAsync,
        isGenerator: false,
        start,
    });
    head = {
        ...head,
        hasHoistedVars,
    };
    checkFunctionNameAndParams(parser, {
        isArrowFunction: true,
        isMethod: false,
        id: undefined,
        params,
        rest,
        start,
    }, body);
    parser.popScope('GENERATOR');
    parser.popScope('FUNCTION');
    parser.state.maybeInArrowParameters = oldMaybeInArrowParameters;
    parser.state.yieldPos = oldYieldPos;
    parser.state.awaitPos = oldAwaitPos;
    return parser.finishNode(start, {
        type: 'ArrowFunctionExpression',
        body,
        head,
    });
}
exports.parseArrowExpression = parseArrowExpression;
function isStrictBody(parser, body) {
    if (body.type === 'BlockStatement' && body.directives !== undefined) {
        for (const directive of body.directives) {
            if (directive.value === 'use strict') {
                return true;
            }
        }
    }
    return false;
}
exports.isStrictBody = isStrictBody;
function parseFunctionBodyAndFinish(parser, opts) {
    let returnType = undefined;
    let predicate;
    // For arrow functions, `parseArrow` handles the return type itself.
    if (!opts.isArrowFunction && parser.match(types_1.types.colon)) {
        [returnType, predicate] = index_2.parseTypeAnnotationAndPredicate(parser);
    }
    const headEnd = parser.getLastEndPosition();
    const head = parser.finishNodeAt(opts.headStart, headEnd, createFunctionHead(parser, opts.params, opts.rest, {
        generator: opts.isGenerator,
        async: opts.isAsync,
        hasHoistedVars: false,
        returnType,
        predicate,
    }));
    if (opts.allowBodiless &&
        !parser.match(types_1.types.braceL) &&
        parser.isLineTerminator()) {
        return {
            head,
            body: undefined,
        };
    }
    const { body, hasHoistedVars } = parseFunctionBody(parser, opts);
    checkFunctionNameAndParams(parser, {
        isArrowFunction: opts.isArrowFunction,
        isMethod: opts.isMethod,
        id: opts.id,
        start: opts.start,
        params: opts.params,
        rest: opts.rest,
    }, body);
    head.hasHoistedVars = hasHoistedVars;
    return {
        head,
        body,
    };
}
exports.parseFunctionBodyAndFinish = parseFunctionBodyAndFinish;
function parseFunctionBody(parser, opts) {
    if (opts.isArrowFunction) {
        return forwardNoArrowParamsConversionAt(parser, opts.start, () => _parseFunctionBody(parser, opts));
    }
    else {
        return _parseFunctionBody(parser, opts);
    }
}
exports.parseFunctionBody = parseFunctionBody;
// Parse function body and check parameters.
function _parseFunctionBody(parser, opts) {
    const { isArrowFunction, isAsync, isGenerator } = opts;
    const isExpression = isArrowFunction && !parser.match(types_1.types.braceL);
    parser.pushScope('PARAMETERS', false);
    parser.pushScope('ASYNC', isAsync);
    let hasHoistedVars = false;
    let body;
    if (isExpression) {
        body = parseMaybeAssign(parser, 'function body');
    }
    else {
        // Start a new scope with regard to labels and the `inGenerator`
        // flag (restore them to their old value afterwards).
        const oldLabels = parser.state.labels;
        parser.pushScope('GENERATOR', isGenerator);
        parser.state.labels = [];
        const oldhasHoistedVars = parser.state.hasHoistedVars;
        parser.state.hasHoistedVars = false;
        body = index_2.parseBlock(parser, true);
        hasHoistedVars = parser.state.hasHoistedVars;
        parser.popScope('GENERATOR');
        parser.state.hasHoistedVars = oldhasHoistedVars;
        parser.state.labels = oldLabels;
    }
    parser.popScope('ASYNC');
    parser.popScope('PARAMETERS');
    return { body, hasHoistedVars };
}
function checkFunctionNameAndParams(parser, opts, body, force) {
    const { isArrowFunction, isMethod, id, rest, params, start } = opts;
    if (!isSimpleParamList(params, rest) &&
        body.type === 'BlockStatement' &&
        body.directives !== undefined) {
        const firstDirective = body.directives[0];
        if (firstDirective !== undefined && firstDirective.value === 'use strict') {
            parser.addDiagnostic({
                loc: firstDirective.loc,
                description: diagnostics_1.descriptions.JS_PARSER.STRICT_DIRECTIVE_IN_NON_SIMPLE_PARAMS,
            });
        }
    }
    if (isArrowFunction &&
        force !== true &&
        parser.state.noArrowParamsConversionAt.includes(start.index)) {
        return undefined;
    }
    // If this is a strict mode function, verify that argument names
    // are not repeated, and it does not try to bind the words `eval`
    const _isStrictBody = isStrictBody(parser, body);
    const isStrict = parser.inScope('STRICT') || _isStrictBody;
    const isSimpleParams = isSimpleParamList(params, rest);
    const shouldCheckLVal = isStrict || isArrowFunction || isMethod || !isSimpleParams;
    parser.pushScope('STRICT', isStrict);
    if (shouldCheckLVal) {
        const clashes = new Map();
        if (id !== undefined) {
            index_2.checkLVal(parser, id, true, undefined, 'function name');
        }
        for (const param of params) {
            if (_isStrictBody && param.type !== 'BindingIdentifier') {
                parser.addDiagnostic({
                    loc: param.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.NON_SIMPLE_PARAM_IN_EXPLICIT_STRICT_FUNCTION,
                });
            }
            index_2.checkLVal(parser, param, true, clashes, 'function parameter list');
        }
    }
    parser.popScope('STRICT');
}
exports.checkFunctionNameAndParams = checkFunctionNameAndParams;
function isSimpleParamList(params, rest) {
    if (rest !== undefined) {
        return false;
    }
    for (const param of params) {
        if (param.type !== 'BindingIdentifier') {
            return false;
        }
    }
    return true;
}
function parseExpressionList(parser, context, openContext, allowEmpty, refShorthandDefaultPos) {
    const elts = [];
    let first = true;
    while (true) {
        if (parser.match(openContext.close) || parser.match(types_1.types.eof)) {
            break;
        }
        if (first) {
            first = false;
        }
        else {
            parser.expect(types_1.types.comma);
            if (parser.match(openContext.close)) {
                break;
            }
        }
        elts.push(parseCallArgument(parser, context, allowEmpty, refShorthandDefaultPos));
    }
    parser.expectClosing(openContext);
    return elts;
}
exports.parseExpressionList = parseExpressionList;
function parseExpressionListNonEmpty(parser, context, openContext, refShorthandDefaultPos) {
    const val = parseExpressionList(parser, context, openContext, false, refShorthandDefaultPos);
    // @ts-ignore: Passed allowEmpty: false above
    return val;
}
exports.parseExpressionListNonEmpty = parseExpressionListNonEmpty;
function parseCallArgument(parser, context, allowHoles = false, refShorthandDefaultPos, refNeedsArrowPos, refTrailingCommaPos) {
    if (allowHoles && parser.match(types_1.types.comma)) {
        return parseArrayHole(parser);
    }
    else if (parser.match(types_1.types.ellipsis)) {
        const spreadNodeStart = parser.state.startPos;
        const elt = parseParenItem(parser, index_2.parseSpread(parser, refShorthandDefaultPos, refNeedsArrowPos), spreadNodeStart);
        if (refTrailingCommaPos && parser.match(types_1.types.comma)) {
            refTrailingCommaPos.index = parser.state.startPos.index;
        }
        return elt;
    }
    else {
        return parseMaybeAssign(parser, context, false, refShorthandDefaultPos, parseParenItem, refNeedsArrowPos);
    }
}
exports.parseCallArgument = parseCallArgument;
// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.
function parseIdentifier(parser, liberal) {
    const start = parser.getPosition();
    const name = parseIdentifierName(parser, liberal);
    return createIdentifier(parser, start, name);
}
exports.parseIdentifier = parseIdentifier;
function parseBindingIdentifier(parser, liberal) {
    return toBindingIdentifier(parser, parseIdentifier(parser, liberal));
}
exports.parseBindingIdentifier = parseBindingIdentifier;
function parseReferenceIdentifier(parser, liberal) {
    return toReferenceIdentifier(parser, parseIdentifier(parser, liberal));
}
exports.parseReferenceIdentifier = parseReferenceIdentifier;
function toBindingIdentifier(parser, node) {
    return parser.finalizeNode({
        ...node,
        type: 'BindingIdentifier',
    });
}
exports.toBindingIdentifier = toBindingIdentifier;
function toAssignmentIdentifier(parser, node) {
    return parser.finalizeNode({
        ...node,
        type: 'AssignmentIdentifier',
    });
}
exports.toAssignmentIdentifier = toAssignmentIdentifier;
function toReferenceIdentifier(parser, node) {
    return parser.finalizeNode({
        ...node,
        type: 'ReferenceIdentifier',
    });
}
exports.toReferenceIdentifier = toReferenceIdentifier;
function toIdentifier(parser, node) {
    return {
        ...node,
        type: 'Identifier',
    };
}
exports.toIdentifier = toIdentifier;
function createIdentifier(parser, start, name) {
    const node = parser.finishNode(start, {
        type: 'Identifier',
        name,
    });
    parser.getLoc(node).identifierName = name;
    return node;
}
exports.createIdentifier = createIdentifier;
function parseIdentifierName(parser, liberal = false) {
    const loc = parser.finishLocAt(parser.state.startPos, parser.state.endPos);
    if (!liberal) {
        checkReservedWord(parser, String(parser.state.tokenValue), loc, !!parser.state.tokenType.keyword, false);
    }
    let name;
    if (parser.match(types_1.types.name)) {
        name = String(parser.state.tokenValue);
    }
    else if (parser.state.tokenType.keyword !== undefined) {
        name = parser.state.tokenType.keyword;
        // `class` and `function` keywords push new context into this.context.
        // But there is no chance to pop the context if the keyword is consumed
        // as an identifier such as a property name.
        // If the previous token is a dot, this does not apply because the
        // context-managing code already ignored the keyword
        if ((name === 'class' || name === 'function') &&
            (parser.state.lastEndPos.index !== ob1_1.ob1Inc(parser.state.lastStartPos.index) ||
                parser.input.charCodeAt(ob1_1.ob1Get0(parser.state.lastStartPos.index)) !==
                    charCodes.dot)) {
            parser.state.context.pop();
        }
    }
    else {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_IDENTIFIER,
        });
        name = '';
    }
    if (!liberal) {
        checkReservedWord(parser, name, loc, parser.state.tokenType.keyword !== undefined, false);
    }
    parser.next();
    return name;
}
exports.parseIdentifierName = parseIdentifierName;
function checkReservedWord(parser, word, loc, checkKeywords, isBinding) {
    if (parser.isSyntaxEnabled('ts')) {
        // TypeScript support in Babel disables reserved word checking...
        // This is mostly because TS allows reserved words in certain scenarios
        // TODO we should just allow those rather than relying on this hack
        return undefined;
    }
    if (parser.inScope('GENERATOR') && word === 'yield') {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.YIELD_NAME_IN_GENERATOR,
        });
    }
    if (parser.inScope('ASYNC') && word === 'await') {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.AWAIT_NAME_IN_ASYNC,
        });
    }
    if (parser.inScope('CLASS_PROPERTY') && word === 'arguments') {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.ARGUMENTS_IN_CLASS_FIELD,
        });
    }
    if (checkKeywords && js_parser_utils_1.isKeyword(word)) {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.UNEXPECTED_KEYWORD(word),
        });
    }
    let isReserved = false;
    if (parser.inScope('STRICT')) {
        if (isBinding) {
            isReserved = js_parser_utils_1.isStrictBindReservedWord(word, parser.inModule);
        }
        else {
            isReserved = js_parser_utils_1.isStrictReservedWord(word, parser.inModule);
        }
    }
    else {
        isReserved = js_parser_utils_1.isReservedWord(word, parser.inModule);
    }
    if (isReserved) {
        if (!parser.inScope('ASYNC') && word === 'await') {
            parser.addDiagnostic({
                loc,
                description: diagnostics_1.descriptions.JS_PARSER.AWAIT_OUTSIDE_ASYNC,
            });
        }
        else {
            parser.addDiagnostic({
                loc,
                description: diagnostics_1.descriptions.JS_PARSER.RESERVED_WORD(word),
            });
        }
    }
}
exports.checkReservedWord = checkReservedWord;
// Parses await expression inside async function.
function parseAwait(parser) {
    if (!parser.state.awaitPos) {
        parser.state.awaitPos = parser.state.index;
    }
    if (!parser.inScope('ASYNC')) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.AWAIT_OUTSIDE_ASYNC,
        });
    }
    const start = parser.getPosition();
    parser.next();
    if (parser.inScope('PARAMETERS')) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.AWAIT_IN_ASYNC_PARAMS,
        });
    }
    if (parser.eat(types_1.types.star)) {
        parser.addDiagnostic({
            start,
            description: diagnostics_1.descriptions.JS_PARSER.AWAIT_STAR,
        });
    }
    const argument = parseMaybeUnary(parser, 'await argument');
    return parser.finishNode(start, { type: 'AwaitExpression', argument });
}
exports.parseAwait = parseAwait;
// Parses yield expression inside generator.
function parseYield(parser, noIn) {
    if (!parser.state.yieldPos) {
        parser.state.yieldPos = parser.state.index;
    }
    const start = parser.getPosition();
    if (parser.inScope('PARAMETERS')) {
        parser.addDiagnostic({
            start,
            description: diagnostics_1.descriptions.JS_PARSER.YIELD_IN_GENERATOR_PARAMS,
        });
    }
    if (parser.state.maybeInArrowParameters &&
        // We only set yieldInPossibleArrowParameters if we haven't already
        // found a possible invalid YieldExpression.
        parser.state.yieldInPossibleArrowParameters === undefined) {
        parser.state.yieldInPossibleArrowParameters = start;
    }
    parser.next();
    let delegate;
    let argument;
    if (parser.match(types_1.types.semi) ||
        (!parser.match(types_1.types.star) && !parser.state.tokenType.startsExpr) ||
        parser.canInsertSemicolon()) {
        delegate = false;
    }
    else {
        delegate = parser.eat(types_1.types.star);
        argument = parseMaybeAssign(parser, 'yield argument', noIn);
    }
    return parser.finishNode(start, {
        type: 'YieldExpression',
        delegate,
        argument,
    });
}
exports.parseYield = parseYield;
function parseNullLiteral(parser) {
    const start = parser.getPosition();
    parser.next();
    return parser.finishNode(start, { type: 'NullLiteral' });
}
function parseStringLiteral(parser) {
    const start = parser.getPosition();
    const value = String(parser.state.tokenValue);
    parser.next();
    return parser.finishNode(start, {
        type: 'StringLiteral',
        value,
    });
}
exports.parseStringLiteral = parseStringLiteral;
function parseBigIntLiteral(parser) {
    const start = parser.getPosition();
    const value = String(parser.state.tokenValue);
    parser.next();
    return parser.finishNode(start, {
        type: 'BigIntLiteral',
        value,
    });
}
function parseNumericLiteral(parser) {
    const start = parser.getPosition();
    const { tokenValue } = parser.state;
    if (!(tokenValue instanceof index_1.NumberTokenValue)) {
        throw new Error('Expected NumberTokenValue');
    }
    const { value, format } = tokenValue;
    parser.next();
    return parser.finishNode(start, {
        type: 'NumericLiteral',
        format,
        value,
    });
}
exports.parseNumericLiteral = parseNumericLiteral;
function parseRegExpLiteral(parser) {
    const start = parser.getPosition();
    const value = parser.state.tokenValue;
    if (!(value instanceof index_1.RegExpTokenValue)) {
        throw new Error('Expected regex token value');
    }
    parser.next();
    const { flags, pattern } = value;
    const regexParser = codec_js_regexp_1.createRegExpParser({
        offsetPosition: {
            // Advance passed first slash
            ...start,
            column: ob1_1.ob1Inc(start.column),
            index: ob1_1.ob1Inc(start.index),
        },
        path: parser.filename,
        input: pattern,
        unicode: flags.has('u'),
    });
    const { diagnostics, expression } = regexParser.parse();
    for (const diagnostic of diagnostics) {
        parser.addDiagnostic(diagnostic);
    }
    return parser.finishNode(start, {
        type: 'RegExpLiteral',
        expression,
        global: flags.has('g'),
        multiline: flags.has('m'),
        sticky: flags.has('y'),
        insensitive: flags.has('i'),
        noDotNewline: flags.has('s'),
        unicode: flags.has('u'),
    });
}
function parseImportOrMetaProperty(parser) {
    if (parser.lookaheadState().tokenType === types_1.types.dot) {
        return parseImportMetaProperty(parser);
    }
    else {
        return parseImportCall(parser);
    }
}
function parseImportCall(parser) {
    parser.expect(types_1.types._import);
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.parenL, types_1.types.parenR, 'array');
    let argument;
    if (parser.match(types_1.types.parenR)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_EXACT_ARGUMENTS,
        });
        argument = toReferenceIdentifier(parser, parser.createUnknownIdentifier('import call argument'));
    }
    else {
        const callArg = parseCallArgument(parser, 'call expression argument', false);
        if (callArg.type === 'ArrayHole') {
            throw new Error('Expected argument, parseExpressionListItem was passed maybeAllowEmpty: false');
        }
        else {
            argument = callArg;
        }
    }
    // TODO warn on multiple arguments
    if (parser.eat(types_1.types.comma)) {
        parser.addDiagnostic({
            start: parser.state.lastStartPos,
            end: parser.state.lastEndPos,
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_TRAILING_COMMA,
        });
    }
    if (argument.type === 'SpreadElement') {
        parser.addDiagnostic({
            loc: argument.loc,
            description: diagnostics_1.descriptions.JS_PARSER.IMPORT_SPREAD,
        });
    }
    parser.expectClosing(openContext);
    const spreadOrExpression = argument.type === 'AmbiguousFlowTypeCastExpression'
        ? argument.expression
        : argument;
    const expression = spreadOrExpression.type === 'SpreadElement'
        ? spreadOrExpression.argument
        : spreadOrExpression;
    return parser.finishNode(start, { type: 'ImportCall', argument: expression });
}
function parseSuper(parser) {
    if (!parser.inScope('METHOD') &&
        !parser.inScope('CLASS_PROPERTY') &&
        parser.sourceType !== 'template') {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.SUPER_OUTSIDE_METHOD,
        });
    }
    const start = parser.getPosition();
    parser.next();
    if (!parser.match(types_1.types.parenL) &&
        !parser.match(types_1.types.bracketL) &&
        !parser.match(types_1.types.dot)) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_SUPER_SUFFIX,
        });
    }
    const loc = parser.finishLoc(start);
    if (parser.match(types_1.types.parenL) &&
        (parser.getLastScope('METHOD') !== 'constructor' ||
            parser.getLastScope('CLASS') !== 'derived') &&
        parser.sourceType !== 'template') {
        parser.addDiagnostic({
            loc,
            description: diagnostics_1.descriptions.JS_PARSER.SUPER_CALL_OUTSIDE_CONSTRUCTOR,
        });
    }
    return parser.finalizeNode({
        type: 'Super',
        loc,
    });
}
function parseDoExpression(parser) {
    const start = parser.getPosition();
    parser.next();
    const oldLabels = parser.state.labels;
    parser.state.labels = [];
    parser.pushScope('FUNCTION', false);
    const body = index_2.parseBlock(parser, false);
    parser.popScope('FUNCTION');
    parser.state.labels = oldLabels;
    return parser.finishNode(start, {
        type: 'DoExpression',
        body,
    });
}
function parseArrayHole(parser) {
    return parser.finishNode(parser.getPosition(), {
        type: 'ArrayHole',
    });
}
exports.parseArrayHole = parseArrayHole;
function parseArrayExpression(parser, refShorthandDefaultPos) {
    const start = parser.getPosition();
    const openContext = parser.expectOpening(types_1.types.bracketL, types_1.types.bracketR, 'array');
    const elements = index_2.toReferencedListOptional(parser, parseExpressionList(parser, 'array element', openContext, true, refShorthandDefaultPos));
    return parser.finishNode(start, {
        type: 'ArrayExpression',
        elements,
    });
}
