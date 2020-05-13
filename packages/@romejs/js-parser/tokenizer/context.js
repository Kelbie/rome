"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const types_1 = require("./types");
class TokContext {
    constructor(token, isExpr, preserveSpace, override) {
        this.token = token;
        this.isExpr = !!isExpr;
        this.preserveSpace = !!preserveSpace;
        this.override = override;
    }
}
exports.TokContext = TokContext;
exports.types = {
    braceStatement: new TokContext('{', false),
    braceExpression: new TokContext('{', true),
    templateQuasi: new TokContext('${', false),
    parenStatement: new TokContext('(', false),
    parenExpression: new TokContext('(', true),
    template: new TokContext('`', true, true, (p) => index_1.readTemplateToken(p)),
    functionExpression: new TokContext('function', true),
    functionStatement: new TokContext('function', false),
    // JSX
    jsxOpenTag: new TokContext('<tag', false),
    jsxCloseTag: new TokContext('</tag', false),
    jsxInner: new TokContext('<tag>...</tag>', true, true),
};
// Token-specific context update code
types_1.types.parenR.updateContext = types_1.types.braceR.updateContext = function (parser) {
    if (parser.state.context.length === 1) {
        parser.state.exprAllowed = true;
        return;
    }
    let out = parser.state.context.pop();
    if (out === exports.types.braceStatement && index_1.getCurContext(parser).token === 'function') {
        out = parser.state.context.pop();
    }
    if (out === undefined) {
        throw new Error('No context found');
    }
    parser.state.exprAllowed = !out.isExpr;
};
types_1.types.name.updateContext = function (parser, prevType) {
    let allowed = false;
    if (prevType !== types_1.types.dot) {
        if ((parser.state.tokenValue === 'of' && !parser.state.exprAllowed) ||
            (parser.state.tokenValue === 'yield' && parser.inScope('GENERATOR'))) {
            allowed = true;
        }
    }
    parser.state.exprAllowed = allowed;
    if (parser.state.isIterator) {
        parser.state.isIterator = false;
    }
};
types_1.types.braceL.updateContext = function (parser, prevType) {
    parser.state.context.push(index_1.isBraceBlock(parser, prevType)
        ? exports.types.braceStatement
        : exports.types.braceExpression);
    parser.state.exprAllowed = true;
};
types_1.types.dollarBraceL.updateContext = function (parser) {
    parser.state.context.push(exports.types.templateQuasi);
    parser.state.exprAllowed = true;
};
types_1.types.parenL.updateContext = function (parser, prevType) {
    const statementParens = prevType === types_1.types._if ||
        prevType === types_1.types._for ||
        prevType === types_1.types._with ||
        prevType === types_1.types._while;
    parser.state.context.push(statementParens ? exports.types.parenStatement : exports.types.parenExpression);
    parser.state.exprAllowed = true;
};
types_1.types.incDec.updateContext = function () {
    // tokExprAllowed stays unchanged
};
types_1.types._function.updateContext = function (parser, prevType) {
    if (prevType.beforeExpr &&
        prevType !== types_1.types.semi &&
        prevType !== types_1.types._else &&
        !(prevType === types_1.types._return &&
            js_parser_utils_1.lineBreak.test(parser.getRawInput(parser.state.lastEndPos.index, parser.state.startPos.index))) &&
        !((prevType === types_1.types.colon || prevType === types_1.types.braceL) &&
            index_1.getCurContext(parser) === exports.types.bStat)) {
        parser.state.context.push(exports.types.functionExpression);
    }
    else {
        parser.state.context.push(exports.types.functionStatement);
    }
    parser.state.exprAllowed = false;
};
types_1.types._class.updateContext = types_1.types._function.updateContext;
types_1.types.backQuote.updateContext = function (parser) {
    if (index_1.getCurContext(parser) === exports.types.template) {
        parser.state.context.pop();
    }
    else {
        parser.state.context.push(exports.types.template);
    }
    parser.state.exprAllowed = false;
};
types_1.types.jsxTagStart.updateContext = function (parser) {
    parser.state.context.push(exports.types.jsxInner); // treat as beginning of JSX expression
    parser.state.context.push(exports.types.jsxOpenTag); // start opening tag context
    parser.state.exprAllowed = false;
};
types_1.types.jsxTagEnd.updateContext = function (parser, prevType) {
    const out = parser.state.context.pop();
    if ((out === exports.types.jsxOpenTag && prevType === types_1.types.slash) ||
        out === exports.types.jsxCloseTag) {
        parser.state.context.pop();
        parser.state.exprAllowed = index_1.getCurContext(parser) === exports.types.jsxInner;
    }
    else {
        parser.state.exprAllowed = true;
    }
};
