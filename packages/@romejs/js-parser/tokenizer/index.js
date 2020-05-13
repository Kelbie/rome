"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const xhtmlEntities_1 = require("../xhtmlEntities");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const types_1 = require("./types");
const context_1 = require("./context");
const index_1 = require("../parser/index");
const unicodeMistakes_1 = require("./unicodeMistakes");
const charCodes = require("@romejs/string-charcodes");
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
const string_utils_1 = require("@romejs/string-utils");
const HEX_NUMBER = /^[\da-fA-F]+$/;
const DECIMAL_NUMBER = /^\d+$/;
// The following character codes are forbidden from 'being
// an immediate sibling of NumericLiteralSeparator _
const forbiddenNumericSeparatorSiblings = {
    decBinOct: [
        charCodes.dot,
        charCodes.uppercaseB,
        charCodes.uppercaseE,
        charCodes.uppercaseO,
        charCodes.underscore,
        // multiple separators are not allowed
        charCodes.lowercaseB,
        charCodes.lowercaseE,
        charCodes.lowercaseO,
    ],
    hex: [
        charCodes.dot,
        charCodes.uppercaseX,
        charCodes.underscore,
        // multiple separators are not allowed
        charCodes.lowercaseX,
    ],
};
const allowedNumericSeparatorSiblingsBin = [
    // 0 - 1
    charCodes.digit0,
    charCodes.digit1,
];
const allowedNumericSeparatorSiblingsOct = [
    // 0 - 7
    ...allowedNumericSeparatorSiblingsBin,
    charCodes.digit2,
    charCodes.digit3,
    charCodes.digit4,
    charCodes.digit5,
    charCodes.digit6,
    charCodes.digit7,
];
const allowedNumericSeparatorSiblingsDec = [
    // 0 - 9
    ...allowedNumericSeparatorSiblingsOct,
    charCodes.digit8,
    charCodes.digit9,
];
const allowedNumericSeparatorSiblingsHex = [
    // 0 - 9, A - F, a - f,
    ...allowedNumericSeparatorSiblingsDec,
    charCodes.uppercaseA,
    charCodes.uppercaseB,
    charCodes.uppercaseC,
    charCodes.uppercaseD,
    charCodes.uppercaseE,
    charCodes.uppercaseF,
    charCodes.lowercaseA,
    charCodes.lowercaseB,
    charCodes.lowercaseC,
    charCodes.lowercaseD,
    charCodes.lowercaseE,
    charCodes.lowercaseF,
];
const allowedNumericSeparatorSiblings = {
    bin: allowedNumericSeparatorSiblingsBin,
    oct: allowedNumericSeparatorSiblingsOct,
    dec: allowedNumericSeparatorSiblingsDec,
    hex: allowedNumericSeparatorSiblingsHex,
};
class RegExpTokenValue {
    constructor(pattern, flags) {
        this.pattern = pattern;
        this.flags = flags;
    }
}
exports.RegExpTokenValue = RegExpTokenValue;
class NumberTokenValue {
    constructor(value, format) {
        this.value = value;
        this.format = format;
    }
}
exports.NumberTokenValue = NumberTokenValue;
// ## Tokenizer
function bumpIndex(parser) {
    const index = ob1_1.ob1Inc(parser.state.index);
    parser.state.index = index;
    return index;
}
function getIndex(parser) {
    return ob1_1.ob1Get0(parser.state.index);
}
function codePointToString(code) {
    // UTF-16 Decoding
    if (code <= 65535) {
        return String.fromCharCode(code);
    }
    else {
        return String.fromCharCode((code - 65536 >> 10) + 55296, (code - 65536 & 1023) + 56320);
    }
}
// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (`"use strict"; 010;` should fail).
function setStrict(parser, isStrict) {
    parser.pushScope('STRICT', isStrict);
    if (!parser.match(types_1.types.num) && !parser.match(types_1.types.string)) {
        return undefined;
    }
    parser.state.index = parser.state.startPos.index;
    while (parser.state.index < parser.state.lineStartIndex) {
        parser.state.lineStartIndex = ob1_1.ob1Coerce0(parser.input.lastIndexOf('\n', ob1_1.ob1Get0(parser.state.lineStartIndex) - 2) +
            1);
        parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
    }
    nextToken(parser);
}
exports.setStrict = setStrict;
function getCurContext(parser) {
    return parser.state.context[parser.state.context.length - 1];
}
exports.getCurContext = getCurContext;
// Read a single token, updating the parser object's token-related
// properties.
function nextToken(parser) {
    const curContext = getCurContext(parser);
    if (!curContext || !curContext.preserveSpace) {
        skipSpace(parser);
    }
    parser.state.containsOctal = false;
    parser.state.octalPosition = undefined;
    parser.state.startPos = parser.getPositionFromState();
    if (parser.state.index >= parser.length) {
        finishToken(parser, types_1.types.eof);
        return undefined;
    }
    if (curContext.override) {
        curContext.override(parser);
    }
    else {
        readToken(parser, fullCharCodeAtPos(parser));
    }
}
exports.nextToken = nextToken;
function readToken(parser, code) {
    const matchedJSX = readJSXToken(parser, code);
    if (matchedJSX) {
        return undefined;
    }
    else {
        return readNormalToken(parser, code);
    }
}
function readJSXToken(parser, code) {
    if (parser.inScope('PROPERTY_NAME')) {
        return false;
    }
    if (parser.inScope('TYPE')) {
        return false;
    }
    if (!parser.shouldTokenizeJSX()) {
        return false;
    }
    const context = getCurContext(parser);
    if (context === context_1.types.jsxInner) {
        readTokenJsx(parser);
        return true;
    }
    if (context === context_1.types.jsxOpenTag || context === context_1.types.jsxCloseTag) {
        if (js_parser_utils_1.isIdentifierStart(code)) {
            readTokenJsxWord(parser);
            return true;
        }
        if (code === charCodes.greaterThan) {
            bumpIndex(parser);
            finishToken(parser, types_1.types.jsxTagEnd);
            return true;
        }
        if ((code === charCodes.quotationMark || code === charCodes.apostrophe) &&
            context === context_1.types.jsxOpenTag) {
            readTokenJsxString(parser, code);
            return true;
        }
    }
    if (code === charCodes.lessThan &&
        parser.state.exprAllowed &&
        parser.input.charCodeAt(getIndex(parser) + 1) !== charCodes.exclamationMark) {
        bumpIndex(parser);
        finishToken(parser, types_1.types.jsxTagStart);
        return true;
    }
    return false;
}
function readNormalToken(parser, code) {
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (js_parser_utils_1.isIdentifierStart(code) || code === charCodes.backslash) {
        readWord(parser);
    }
    else {
        getTokenFromCode(parser, code);
    }
}
function fullCharCodeAtPos(parser) {
    return js_parser_utils_1.getFullCharCodeAt(parser.input, getIndex(parser));
}
function pushComment(parser, opts) {
    const loc = parser.finishLocAt(opts.startPos, opts.endPos);
    let comment;
    if (opts.block) {
        comment = parser.comments.addComment({
            type: 'CommentBlock',
            value: string_utils_1.removeCarriageReturn(opts.text),
            loc,
        });
    }
    else {
        comment = parser.comments.addComment({
            type: 'CommentLine',
            value: opts.text,
            loc,
        });
    }
    // TODO maybe make sure this is at the head?
    // We should enable flow syntax when there's a comment with @\flow
    // We also handle @\noflow here as it's sometimes in files that have type annotations
    if (opts.text.includes('@flow') || opts.text.includes('@noflow')) {
        if (parser.syntax.has('ts')) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.FLOW_ANNOTATION_WITH_TYPESCRIPT_ENABLED,
            });
        }
        else {
            parser.syntax.add('flow');
            // Let's also implicitly allow JSX
            parser.syntax.add('jsx');
        }
    }
    // We should enable jsx syntax when there's a comment with @\jsx
    if (opts.text.includes('@jsx')) {
        parser.syntax.add('jsx');
    }
    if (parser.isLookahead === false) {
        parser.state.comments.push(comment);
        index_1.addComment(parser, comment);
    }
    if (parser.shouldCreateToken()) {
        /*parser.pushToken({
          type: tt.comment,
          loc,
        });*/
    }
    return comment;
}
function skipBlockComment(parser) {
    const startPos = parser.getPositionFromState();
    const startIndex = parser.state.index;
    parser.state.index = ob1_1.ob1Add(parser.state.index, 2);
    const endIndex = ob1_1.ob1Coerce0(parser.input.indexOf('*/', getIndex(parser)));
    if (endIndex === ob1_1.ob1Number0Neg1) {
        parser.addDiagnostic({
            end: parser.getPositionFromIndex(ob1_1.ob1Sub(parser.state.index, 2)),
            description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_BLOCK_COMMENT,
        });
        return undefined;
    }
    // Skip */
    parser.state.index = ob1_1.ob1Add(endIndex, 2);
    js_parser_utils_1.lineBreakG.lastIndex = ob1_1.ob1Get0(startIndex);
    let match;
    while ((match = js_parser_utils_1.lineBreakG.exec(parser.input)) &&
        match.index < ob1_1.ob1Get0(parser.state.index)) {
        parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
        parser.resetTokenizerLine();
        parser.state.lineStartIndex = ob1_1.ob1Coerce0(match.index + match[0].length);
    }
    pushComment(parser, {
        block: true,
        text: parser.getRawInput(ob1_1.ob1Add(startIndex, 2), endIndex),
        startPos,
        endPos: parser.getPositionFromState(),
    });
}
function skipLineComment(parser, startSkip) {
    const startIndex = parser.state.index;
    const startPos = parser.getPositionFromState();
    parser.state.index = ob1_1.ob1Add(parser.state.index, startSkip);
    let ch = parser.input.charCodeAt(getIndex(parser));
    if (parser.state.index < parser.length) {
        while (ch !== charCodes.lineFeed &&
            ch !== charCodes.carriageReturn &&
            ch !== charCodes.lineSeparator &&
            ch !== charCodes.paragraphSeparator &&
            bumpIndex(parser) < parser.length) {
            ch = parser.input.charCodeAt(getIndex(parser));
        }
    }
    return pushComment(parser, {
        block: false,
        text: parser.getRawInput(ob1_1.ob1Add(startIndex, startSkip), parser.state.index),
        startPos,
        endPos: parser.getPositionFromState(),
    });
}
exports.skipLineComment = skipLineComment;
// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.
function skipSpace(parser) {
    loop: while (parser.state.index < parser.length) {
        const ch = parser.input.charCodeAt(getIndex(parser));
        if (parser.state.lineStart) {
            if (ch === charCodes.space || ch === charCodes.tab) {
                parser.state.indentLevel = ob1_1.ob1Inc(parser.state.indentLevel);
            }
            else {
                parser.state.lineStart = false;
            }
        }
        if (ch === charCodes.carriageReturn &&
            parser.input.charCodeAt(ob1_1.ob1Get0(parser.state.index) + 1) ===
                charCodes.lineFeed) {
            bumpIndex(parser);
        }
        switch (ch) {
            case charCodes.space:
            case charCodes.nonBreakingSpace: {
                bumpIndex(parser);
                break;
            }
            case charCodes.carriageReturn:
            case charCodes.lineFeed:
            case charCodes.lineSeparator:
            case charCodes.paragraphSeparator: {
                bumpIndex(parser);
                parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
                parser.resetTokenizerLine();
                break;
            }
            case charCodes.slash: {
                switch (parser.input.charCodeAt(getIndex(parser) + 1)) {
                    case charCodes.asterisk: {
                        // Break the loop and don't consume Flow comment code
                        if (parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.colon &&
                            parser.input.charCodeAt(getIndex(parser) + 3) === charCodes.colon) {
                            break loop;
                        }
                        skipBlockComment(parser);
                        break;
                    }
                    case charCodes.slash: {
                        skipLineComment(parser, 2);
                        break;
                    }
                    default:
                        break loop;
                }
                break;
            }
            default:
                if ((ch > charCodes.backSpace && ch < charCodes.shiftOut) ||
                    (ch >= charCodes.oghamSpaceMark &&
                        js_parser_utils_1.nonASCIIwhitespace.test(String.fromCharCode(ch)))) {
                    bumpIndex(parser);
                }
                else {
                    break loop;
                }
        }
    }
}
// Called at the end of every token. Sets `end`, `val`, and
// maintains `context` and `exprAllowed`, and skips the space after
// the token, so that the next one's `start` will point at the
// right position.
function finishToken(parser, type, val) {
    parser.state.endPos = parser.getPositionFromState();
    const prevType = parser.state.tokenType;
    parser.state.tokenType = type;
    parser.state.tokenValue = val;
    updateContext(parser, prevType);
}
exports.finishToken = finishToken;
function readTokenDot(parser) {
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    if (next >= charCodes.digit0 && next <= charCodes.digit9) {
        readNumber(parser, true);
        return undefined;
    }
    const next2 = parser.input.charCodeAt(getIndex(parser) + 2);
    if (next === charCodes.dot && next2 === charCodes.dot) {
        parser.state.index = ob1_1.ob1Add(parser.state.index, 3);
        finishToken(parser, types_1.types.ellipsis);
    }
    else {
        bumpIndex(parser);
        finishToken(parser, types_1.types.dot);
    }
}
function readTokenSlash(parser) {
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    // If this starts with /*:: then it's a Flow comment
    // TODO Flow also allows "flow-include" in place of "::"
    if (next === charCodes.asterisk &&
        parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.colon &&
        parser.input.charCodeAt(getIndex(parser) + 3) === charCodes.colon) {
        parser.state.index = ob1_1.ob1Add(parser.state.index, 4);
        parser.pushScope('FLOW_COMMENT');
        nextToken(parser);
        return;
    }
    // '/'
    if (parser.state.exprAllowed) {
        bumpIndex(parser);
        readRegexp(parser);
        return;
    }
    if (next === charCodes.equalsTo) {
        finishOp(parser, types_1.types.assign, 2);
    }
    else {
        finishOp(parser, types_1.types.slash, 1);
    }
}
function readTokenMultModulo(parser, code) {
    let next = parser.input.charCodeAt(getIndex(parser) + 1);
    // */ Is the end of a Flow comment
    if (code === charCodes.asterisk &&
        parser.inScope('FLOW_COMMENT') &&
        next === charCodes.slash) {
        parser.popScope('FLOW_COMMENT');
        parser.state.index = ob1_1.ob1Add(parser.state.index, 2);
        nextToken(parser);
        return;
    }
    // '%*'
    let type = code === charCodes.asterisk ? types_1.types.star : types_1.types.modulo;
    let width = 1;
    const exprAllowed = parser.state.exprAllowed;
    // Exponentiation operator **
    if (code === charCodes.asterisk && next === charCodes.asterisk) {
        width++;
        next = parser.input.charCodeAt(getIndex(parser) + 2);
        type = types_1.types.exponent;
    }
    if (next === charCodes.equalsTo && !exprAllowed) {
        width++;
        type = types_1.types.assign;
    }
    finishOp(parser, type, width);
}
function readTokenPipeAmp(parser, code) {
    // '|&'
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    if (next === code) {
        finishOp(parser, code === charCodes.verticalBar ? types_1.types.logicalOR : types_1.types.logicalAND, 2);
        return undefined;
    }
    // '|}'
    if (code === charCodes.verticalBar && next === charCodes.rightCurlyBrace) {
        finishOp(parser, types_1.types.braceBarR, 2);
        return undefined;
    }
    if (next === charCodes.equalsTo) {
        finishOp(parser, types_1.types.assign, 2);
        return undefined;
    }
    finishOp(parser, code === charCodes.verticalBar ? types_1.types.bitwiseOR : types_1.types.bitwiseAND, 1);
}
function readTokenCaret(parser) {
    // '^'
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    if (next === charCodes.equalsTo) {
        finishOp(parser, types_1.types.assign, 2);
    }
    else {
        finishOp(parser, types_1.types.bitwiseXOR, 1);
    }
}
function readTokenPlusMin(parser, code) {
    // '+-'
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    if (next === code) {
        if (next === charCodes.dash &&
            !parser.inModule &&
            parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.greaterThan &&
            (parser.state.lastEndPos.index === ob1_1.ob1Number0 ||
                js_parser_utils_1.lineBreak.test(parser.getRawInput(parser.state.lastEndPos.index, parser.state.index)))) {
            // A `-->` line comment
            skipLineComment(parser, 3);
            skipSpace(parser);
            nextToken(parser);
            return undefined;
        }
        finishOp(parser, types_1.types.incDec, 2);
        return undefined;
    }
    if (next === charCodes.equalsTo) {
        finishOp(parser, types_1.types.assign, 2);
    }
    else {
        finishOp(parser, types_1.types.plusMin, 1);
    }
}
function readTokenLtGt(parser, code) {
    // '<>'
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    let size = 1;
    // we need to check if we're in a type to avoid interpreting the >> in Array<Array<string>> as a bitshift
    if (next === code && !parser.inScope('TYPE')) {
        size =
            code === charCodes.greaterThan &&
                parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.greaterThan
                ? 3
                : 2;
        if (parser.input.charCodeAt(getIndex(parser) + size) === charCodes.equalsTo) {
            finishOp(parser, types_1.types.assign, size + 1);
            return undefined;
        }
        finishOp(parser, types_1.types.bitShift, size);
        return undefined;
    }
    if (code === charCodes.lessThan &&
        next === charCodes.exclamationMark &&
        !parser.inModule &&
        parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.dash &&
        parser.input.charCodeAt(getIndex(parser) + 3) === charCodes.dash) {
        // `<!--`, an XML-style comment that should be interpreted as a line comment
        skipLineComment(parser, 4);
        skipSpace(parser);
        nextToken(parser);
        return undefined;
    }
    if (next === charCodes.equalsTo) {
        // <= | >=
        size = 2;
    }
    finishOp(parser, types_1.types.relational, size);
}
function readTokenEqExcl(parser, code) {
    // '=!'
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    if (next === charCodes.equalsTo) {
        finishOp(parser, types_1.types.equality, parser.input.charCodeAt(getIndex(parser) + 2) === charCodes.equalsTo
            ? 3
            : 2);
        return undefined;
    }
    if (code === charCodes.equalsTo && next === charCodes.greaterThan) {
        // '=>'
        parser.state.index = ob1_1.ob1Add(parser.state.index, 2);
        finishToken(parser, types_1.types.arrow);
        return undefined;
    }
    finishOp(parser, code === charCodes.equalsTo ? types_1.types.eq : types_1.types.bang, 1);
}
function readTokenQuestion(parser) {
    const next = parser.input.charCodeAt(getIndex(parser) + 1);
    const next2 = parser.input.charCodeAt(getIndex(parser) + 2);
    if (next === charCodes.questionMark && !parser.inScope('TYPE')) {
        if (next2 === charCodes.equalsTo) {
            // '??='
            finishOp(parser, types_1.types.assign, 3);
        }
        else {
            // '??'
            finishOp(parser, types_1.types.nullishCoalescing, 2);
        }
    }
    else if (next === charCodes.dot &&
        !(next2 >= charCodes.digit0 && next2 <= charCodes.digit9)) {
        // '.' not followed by a number
        parser.state.index = ob1_1.ob1Add(parser.state.index, 2);
        finishToken(parser, types_1.types.questionDot);
    }
    else {
        // '?'
        bumpIndex(parser);
        finishToken(parser, types_1.types.question);
    }
}
function readTokenNumberSign(parser) {
    // Only tokenize a hash if we're inside of a class, or if we're the first character in the file (hashbang indicator)
    if (ob1_1.ob1Get0(parser.state.classLevel) > 0 || parser.state.index === ob1_1.ob1Number0) {
        bumpIndex(parser);
        finishToken(parser, types_1.types.hash);
        return undefined;
    }
    // TODO make this a diagnostic, and advance to the next line if suspected hashbang
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.UNEXPECTED_HASH(parser.input[getIndex(parser) + 1] === '!'),
    });
    bumpIndex(parser);
    nextToken(parser);
}
function getTokenFromCode(parser, code) {
    if (code === charCodes.digit0) {
        const next = parser.input.charCodeAt(getIndex(parser) + 1);
        // '0x', '0X' - hex number
        if (next === charCodes.lowercaseX || next === charCodes.uppercaseX) {
            readRadixNumber(parser, 16, 'hex');
            return undefined;
        }
        // '0o', '0O' - octal number
        if (next === charCodes.lowercaseO || next === charCodes.uppercaseO) {
            readRadixNumber(parser, 8, 'octal');
            return undefined;
        }
        // '0b', '0B' - binary number
        if (next === charCodes.lowercaseB || next === charCodes.uppercaseB) {
            readRadixNumber(parser, 2, 'binary');
            return undefined;
        }
    }
    switch (code) {
        case charCodes.numberSign:
            return readTokenNumberSign(parser);
        // The interpretation of a dot depends on whether it is followed
        // by a digit or another two dots.
        case charCodes.dot: {
            readTokenDot(parser);
            return undefined;
        }
        // Punctuation tokens.
        case charCodes.leftParenthesis: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.parenL);
            return undefined;
        }
        case charCodes.rightParenthesis: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.parenR);
            return undefined;
        }
        case charCodes.semicolon: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.semi);
            return undefined;
        }
        case charCodes.comma: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.comma);
            return undefined;
        }
        case charCodes.leftSquareBracket: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.bracketL);
            return undefined;
        }
        case charCodes.rightSquareBracket: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.bracketR);
            return undefined;
        }
        case charCodes.leftCurlyBrace: {
            if (parser.input.charCodeAt(getIndex(parser) + 1) ===
                charCodes.verticalBar) {
                finishOp(parser, types_1.types.braceBarL, 2);
            }
            else {
                bumpIndex(parser);
                finishToken(parser, types_1.types.braceL);
            }
            return undefined;
        }
        case charCodes.rightCurlyBrace: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.braceR);
            return undefined;
        }
        case charCodes.colon: {
            if (parser.input.charCodeAt(getIndex(parser) + 1) === charCodes.colon) {
                finishOp(parser, types_1.types.doubleColon, 2);
            }
            else {
                bumpIndex(parser);
                finishToken(parser, types_1.types.colon);
            }
            return undefined;
        }
        case charCodes.questionMark: {
            readTokenQuestion(parser);
            return undefined;
        }
        case charCodes.atSign: {
            // The token @@ is the start of a Flow iterator name
            const next = parser.input.charCodeAt(getIndex(parser) + 1);
            if (next === charCodes.atSign) {
                parser.state.isIterator = true;
                readWord(parser);
            }
            else {
                bumpIndex(parser);
                finishToken(parser, types_1.types.at);
            }
            return undefined;
        }
        case charCodes.graveAccent: {
            bumpIndex(parser);
            finishToken(parser, types_1.types.backQuote);
            return undefined;
        }
        // Anything else beginning with a digit is an integer, octal
        // number, or float.
        case charCodes.digit0:
        case charCodes.digit1:
        case charCodes.digit2:
        case charCodes.digit3:
        case charCodes.digit4:
        case charCodes.digit5:
        case charCodes.digit6:
        case charCodes.digit7:
        case charCodes.digit8:
        case charCodes.digit9: {
            readNumber(parser, false);
            return undefined;
        }
        // Quotes produce strings.
        case charCodes.quotationMark:
        case charCodes.apostrophe: {
            readString(parser, code);
            return undefined;
        }
        // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
        // often referred to. `finishOp` simply skips the amount of
        // characters it is given as second argument, and returns a token
        // of the type given by its first argument.
        case charCodes.slash: {
            readTokenSlash(parser);
            return undefined;
        }
        case charCodes.percentSign:
        case charCodes.asterisk: {
            readTokenMultModulo(parser, code);
            return undefined;
        }
        case charCodes.verticalBar:
        case charCodes.ampersand: {
            readTokenPipeAmp(parser, code);
            return undefined;
        }
        case charCodes.caret: {
            readTokenCaret(parser);
            return undefined;
        }
        case charCodes.plusSign:
        case charCodes.dash: {
            readTokenPlusMin(parser, code);
            return undefined;
        }
        case charCodes.lessThan:
        case charCodes.greaterThan: {
            readTokenLtGt(parser, code);
            return undefined;
        }
        case charCodes.equalsTo:
        case charCodes.exclamationMark: {
            readTokenEqExcl(parser, code);
            return undefined;
        }
        case charCodes.tilde: {
            finishOp(parser, types_1.types.tilde, 1);
            return undefined;
        }
    }
    const char = parser.input[getIndex(parser)];
    const unicodeMistake = unicodeMistakes_1.UNICODE_MISTAKES.get(char);
    if (unicodeMistake !== undefined) {
        const [unicodeName, equivalentChar] = unicodeMistake;
        const equivalentName = unicodeMistakes_1.ASCII_NAMES.get(equivalentChar);
        if (equivalentName === undefined) {
            throw new Error(`Expected ASCII name for ${equivalentChar}`);
        }
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.UNEXPECTED_UNICODE_CHARACTER(char, unicodeName, equivalentChar, equivalentName),
        });
        // Read the token as the equivalent character
        getTokenFromCode(parser, equivalentChar.charCodeAt(0));
        return;
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.PARSER_CORE.UNEXPECTED_CHARACTER(codePointToString(code)),
    });
    // Skip unknown characters
    bumpIndex(parser);
    nextToken(parser);
}
function finishOp(parser, type, size) {
    const str = parser.getRawInput(parser.state.index, ob1_1.ob1Add(parser.state.index, size));
    parser.state.index = ob1_1.ob1Add(parser.state.index, size);
    finishToken(parser, type, str);
}
function readRegexp(parser) {
    const start = parser.state.index;
    let escaped;
    let inClass;
    while (true) {
        if (parser.state.index >= parser.length) {
            parser.addDiagnostic({
                end: parser.getPositionFromIndex(parser.state.index),
                description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_REGEX,
            });
            break;
        }
        const ch = parser.input.charAt(getIndex(parser));
        if (js_parser_utils_1.lineBreak.test(ch)) {
            if (parser.input.charAt(getIndex(parser) - 2) ===
                String.fromCharCode(charCodes.backslash) ||
                parser.input.charAt(getIndex(parser) - 3) ===
                    String.fromCharCode(charCodes.backslash)) {
                const line = parser.input.slice(0, getIndex(parser));
                const backslashIndex = line.lastIndexOf(String.fromCharCode(charCodes.backslash));
                parser.addDiagnostic({
                    end: parser.getPositionFromIndex(ob1_1.ob1Coerce0(backslashIndex)),
                    description: diagnostics_1.descriptions.JS_PARSER.DANGLING_BACKSLASH_IN_REGEX,
                });
                break;
            }
            parser.addDiagnostic({
                end: parser.getPositionFromIndex(parser.state.index),
                description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_REGEX,
            });
            break;
        }
        if (escaped) {
            escaped = false;
        }
        else {
            if (ch === '[') {
                inClass = true;
            }
            else if (ch === ']' && inClass) {
                inClass = false;
            }
            else if (ch === '/' && !inClass) {
                break;
            }
            escaped = ch === '\\';
        }
        bumpIndex(parser);
    }
    const content = parser.getRawInput(start, parser.state.index);
    bumpIndex(parser);
    const rawMods = readWord1(parser);
    if (parser.state.escapePosition !== undefined) {
        parser.addDiagnostic({
            index: parser.state.escapePosition,
            description: diagnostics_1.descriptions.JS_PARSER.UNICODE_ESCAPE_IN_REGEX_FLAGS,
        });
    }
    const mods = js_parser_utils_1.validateRegexFlags(rawMods, (metadata, flagPosition) => {
        parser.addDiagnostic({
            index: ob1_1.ob1Add(ob1_1.ob1Coerce0(getIndex(parser) - rawMods.length), flagPosition),
            description: metadata,
        });
    });
    finishToken(parser, types_1.types.regexp, new RegExpTokenValue(content, mods));
}
exports.readRegexp = readRegexp;
// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.
function readInt(parser, radix, len) {
    const start = parser.state.index;
    const forbiddenSiblings = radix === 16
        ? forbiddenNumericSeparatorSiblings.hex
        : forbiddenNumericSeparatorSiblings.decBinOct;
    let allowedSiblings;
    if (radix === 16) {
        allowedSiblings = allowedNumericSeparatorSiblings.hex;
    }
    else if (radix === 10) {
        allowedSiblings = allowedNumericSeparatorSiblings.dec;
    }
    else if (radix === 8) {
        allowedSiblings = allowedNumericSeparatorSiblings.oct;
    }
    else {
        allowedSiblings = allowedNumericSeparatorSiblings.bin;
    }
    let total = 0;
    for (let i = 0, e = len === undefined ? Infinity : len; i < e; ++i) {
        const code = parser.input.charCodeAt(getIndex(parser));
        let val;
        const prev = parser.input.charCodeAt(getIndex(parser) - 1);
        const next = parser.input.charCodeAt(getIndex(parser) + 1);
        if (code === charCodes.underscore) {
            if (allowedSiblings.indexOf(next) === -1) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.INVALID_INT_TOKEN,
                });
            }
            if (forbiddenSiblings.indexOf(prev) > -1 ||
                forbiddenSiblings.indexOf(next) > -1 ||
                Number.isNaN(next)) {
                parser.addDiagnostic({
                    description: diagnostics_1.descriptions.JS_PARSER.INVALID_INT_TOKEN,
                });
            }
            // Ignore this _ character
            bumpIndex(parser);
            continue;
        }
        if (code >= charCodes.lowercaseA) {
            val = code - charCodes.lowercaseA + charCodes.lineFeed;
        }
        else if (code >= charCodes.uppercaseA) {
            val = code - charCodes.uppercaseA + charCodes.lineFeed;
        }
        else if (charCodes.isDigit(code)) {
            val = code - charCodes.digit0; // 0-9
        }
        else {
            val = Infinity;
        }
        if (val >= radix) {
            break;
        }
        bumpIndex(parser);
        total = total * radix + val;
    }
    if (parser.state.index === start ||
        (len !== undefined && getIndex(parser) - ob1_1.ob1Get0(start) !== len)) {
        return undefined;
    }
    return total;
}
function readRadixNumber(parser, radix, format) {
    const start = parser.state.index;
    let isBigInt = false;
    parser.state.index = ob1_1.ob1Add(parser.state.index, 2); // 0x
    let val = readInt(parser, radix);
    if (val === undefined) {
        parser.addDiagnostic({
            index: ob1_1.ob1Add(start, 2),
            description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_NUMBER_IN_RADIX(radix),
        });
        val = 0;
    }
    if (parser.input.charCodeAt(getIndex(parser)) === charCodes.lowercaseN) {
        bumpIndex(parser);
        isBigInt = true;
    }
    if (js_parser_utils_1.isIdentifierStart(fullCharCodeAtPos(parser))) {
        parser.addDiagnostic({
            index: parser.state.index,
            description: diagnostics_1.descriptions.JS_PARSER.IDENTIFIER_AFTER_NUMBER,
        });
    }
    if (isBigInt) {
        const str = parser.getRawInput(start, parser.state.index).replace(/[_n]/g, '');
        finishToken(parser, types_1.types.bigint, str);
        return undefined;
    }
    finishToken(parser, types_1.types.num, new NumberTokenValue(val, format));
}
// Read an integer, octal integer, or floating-point number.
function readNumber(parser, startsWithDot) {
    const start = parser.state.startPos;
    let isFloat = false;
    let isBigInt = false;
    if (!startsWithDot && readInt(parser, 10) === undefined) {
        parser.addDiagnostic({
            index: parser.state.index,
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_NUMBER,
        });
    }
    let isOctal = ob1_1.ob1Get0(parser.state.index) - ob1_1.ob1Get0(start.index) >= 2 &&
        parser.input.charCodeAt(ob1_1.ob1Get0(start.index)) === charCodes.digit0;
    if (isOctal) {
        if (parser.inScope('STRICT')) {
            parser.addDiagnostic({
                index: parser.state.index,
                description: diagnostics_1.descriptions.JS_PARSER.LEGACY_OCTAL_IN_STRICT_MODE,
            });
        }
        if (/[89]/.test(parser.getRawInput(start.index, parser.state.index))) {
            isOctal = false;
        }
    }
    let next = parser.input.charCodeAt(getIndex(parser));
    if (next === charCodes.dot && !isOctal) {
        bumpIndex(parser);
        readInt(parser, 10);
        isFloat = true;
        next = parser.input.charCodeAt(getIndex(parser));
    }
    if ((next === charCodes.uppercaseE || next === charCodes.lowercaseE) &&
        !isOctal) {
        next = parser.input.charCodeAt(ob1_1.ob1Get0(bumpIndex(parser)));
        if (next === charCodes.plusSign || next === charCodes.dash) {
            bumpIndex(parser);
        }
        if (readInt(parser, 10) === undefined) {
            parser.addDiagnostic({
                index: parser.state.index,
                description: diagnostics_1.descriptions.JS_PARSER.INVALID_NUMBER,
            });
        }
        isFloat = true;
        next = parser.input.charCodeAt(getIndex(parser));
    }
    if (next === charCodes.lowercaseN) {
        // Disallow floats and legacy octal syntax, new style octal ("0o") is handled in readRadixNumber
        if (isFloat) {
            parser.addDiagnostic({
                index: parser.state.index,
                description: diagnostics_1.descriptions.JS_PARSER.DECIMAL_BIGINT,
            });
        }
        if (isOctal) {
            parser.addDiagnostic({
                index: parser.state.index,
                description: diagnostics_1.descriptions.JS_PARSER.OCTAL_BIGINT,
            });
        }
        bumpIndex(parser);
        isBigInt = true;
    }
    if (js_parser_utils_1.isIdentifierStart(parser.input.codePointAt(getIndex(parser)))) {
        parser.addDiagnostic({
            index: parser.state.index,
            description: diagnostics_1.descriptions.JS_PARSER.IDENTIFIER_AFTER_NUMBER,
        });
    }
    // Remove "_" for numeric literal separator, and "n" for BigInts
    const str = parser.getRawInput(start.index, parser.state.index).replace(/[_n]/g, '');
    if (isBigInt) {
        finishToken(parser, types_1.types.bigint, str);
        return undefined;
    }
    const num = isOctal ? parseInt(str, 8) : parseFloat(str);
    finishToken(parser, types_1.types.num, new NumberTokenValue(num, isOctal ? 'octal' : undefined));
}
// Read a string value, interpreting backslash-escapes.
function readCodePoint(parser, throwOnInvalid) {
    const ch = parser.input.charCodeAt(getIndex(parser));
    let code;
    if (ch === charCodes.leftCurlyBrace) {
        const codePos = parser.state.index;
        bumpIndex(parser);
        code = readHexChar(parser, parser.input.indexOf('}', getIndex(parser)) - getIndex(parser), throwOnInvalid);
        bumpIndex(parser);
        if (code === undefined) {
            // @ts-ignore
            parser.state.invalidTemplateEscapePosition--; // to point to the '\'' instead of the 'u'
        }
        else if (code > 1114111) {
            if (throwOnInvalid) {
                parser.addDiagnostic({
                    index: codePos,
                    description: diagnostics_1.descriptions.JS_PARSER.OUT_OF_BOUND_CODE_POINT,
                });
            }
            else {
                parser.state.invalidTemplateEscapePosition = ob1_1.ob1Sub(codePos, 2);
                return undefined;
            }
        }
    }
    else {
        code = readHexChar(parser, 4, throwOnInvalid);
    }
    return code;
}
function readString(parser, quote) {
    let out = '';
    let chunkStart = bumpIndex(parser);
    while (true) {
        if (parser.state.index >= parser.length) {
            parser.addDiagnostic({
                end: parser.getPositionFromIndex(parser.state.index),
                description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_STRING,
            });
            break;
        }
        const ch = parser.input.charCodeAt(getIndex(parser));
        if (ch === quote) {
            break;
        }
        if (ch === charCodes.backslash) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            out += readEscapedChar(parser, false);
            chunkStart = parser.state.index;
        }
        else if (ch === charCodes.lineSeparator ||
            ch === charCodes.paragraphSeparator) {
            bumpIndex(parser);
            parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
        }
        else {
            if (js_parser_utils_1.isNewLine(ch)) {
                parser.addDiagnostic({
                    end: parser.getPositionFromIndex(parser.state.index),
                    description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_STRING,
                });
            }
            bumpIndex(parser);
        }
    }
    out += parser.getRawInput(chunkStart, parser.state.index);
    bumpIndex(parser);
    finishToken(parser, types_1.types.string, out);
}
// Reads template string tokens.
function readTemplateToken(parser) {
    let out = '';
    let chunkStart = parser.state.index;
    let containsInvalid = false;
    while (true) {
        if (parser.state.index >= parser.length) {
            parser.addDiagnostic({
                end: parser.getPositionFromIndex(parser.state.index),
                description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_TEMPLATE,
            });
            break;
        }
        const ch = parser.input.charCodeAt(getIndex(parser));
        if (ch === charCodes.graveAccent ||
            (ch === charCodes.dollarSign &&
                parser.input.charCodeAt(getIndex(parser) + 1) === charCodes.leftCurlyBrace)) {
            if (parser.state.index === parser.state.startPos.index &&
                parser.match(types_1.types.template)) {
                if (ch === charCodes.dollarSign) {
                    parser.state.index = ob1_1.ob1Add(parser.state.index, 2);
                    finishToken(parser, types_1.types.dollarBraceL);
                    return undefined;
                }
                else {
                    bumpIndex(parser);
                    finishToken(parser, types_1.types.backQuote);
                    return undefined;
                }
            }
            out += parser.getRawInput(chunkStart, parser.state.index);
            finishToken(parser, types_1.types.template, containsInvalid ? undefined : out);
            return undefined;
        }
        if (ch === charCodes.backslash) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            const escaped = readEscapedChar(parser, true);
            if (escaped === undefined) {
                containsInvalid = true;
            }
            else {
                out += escaped;
            }
            chunkStart = parser.state.index;
        }
        else if (js_parser_utils_1.isNewLine(ch)) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            bumpIndex(parser);
            if (ch === charCodes.carriageReturn &&
                parser.input.charCodeAt(getIndex(parser)) === charCodes.lineFeed) {
                bumpIndex(parser);
            }
            switch (ch) {
                case charCodes.carriageReturn:
                case charCodes.lineFeed: {
                    out += '\n';
                    break;
                }
                default: {
                    out += String.fromCharCode(ch);
                    break;
                }
            }
            parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
            parser.resetTokenizerLine();
            chunkStart = parser.state.index;
        }
        else {
            bumpIndex(parser);
        }
    }
}
exports.readTemplateToken = readTemplateToken;
// Used to read escaped characters
function readEscapedChar(parser, inTemplate) {
    const throwOnInvalid = !inTemplate;
    const ch = parser.input.charCodeAt(ob1_1.ob1Get0(bumpIndex(parser)));
    bumpIndex(parser);
    if (ch === charCodes.carriageReturn &&
        parser.input.charCodeAt(getIndex(parser)) === charCodes.lineFeed) {
        bumpIndex(parser);
    }
    switch (ch) {
        case charCodes.lowercaseN:
            return '\n';
        case charCodes.lowercaseR:
            return '\r';
        case charCodes.lowercaseX: {
            const code = readHexChar(parser, 2, throwOnInvalid);
            return code === undefined ? undefined : String.fromCharCode(code);
        }
        case charCodes.lowercaseU: {
            const code = readCodePoint(parser, throwOnInvalid);
            return code === undefined ? undefined : codePointToString(code);
        }
        case charCodes.lowercaseT:
            return '\t';
        case charCodes.lowercaseB:
            return '\b';
        case charCodes.lowercaseV:
            return '\x0b';
        case charCodes.lowercaseF:
            return '\f';
        case charCodes.carriageReturn:
        case charCodes.lineFeed: {
            parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
            parser.resetTokenizerLine();
            return '';
        }
        default: {
            if (ch >= charCodes.digit0 && ch <= charCodes.digit7) {
                const codePos = ob1_1.ob1Dec(parser.state.index);
                const octalMatches = parser.input.substr(getIndex(parser) - 1, 3).match(/^[0-7]+/);
                let octalStr = octalMatches[0];
                let octal = parseInt(octalStr, 8);
                if (octal > 255) {
                    octalStr = octalStr.slice(0, -1);
                    octal = parseInt(octalStr, 8);
                }
                if (octal > 0) {
                    if (inTemplate) {
                        parser.state.invalidTemplateEscapePosition = codePos;
                        return undefined;
                    }
                    else if (parser.inScope('STRICT')) {
                        parser.addDiagnostic({
                            index: codePos,
                            description: diagnostics_1.descriptions.JS_PARSER.OCTAL_IN_STRICT_MODE,
                        });
                    }
                    else if (!parser.state.containsOctal) {
                        // These properties are only used to throw an error for an octal which occurs
                        // in a directive which occurs prior to a "use strict" directive.
                        parser.state.containsOctal = true;
                        parser.state.octalPosition = codePos;
                    }
                }
                parser.state.index = ob1_1.ob1Add(parser.state.index, octalStr.length - 1);
                return String.fromCharCode(octal);
            }
            return String.fromCharCode(ch);
        }
    }
}
// Used to read character escape sequences ('\x', '\u').
function readHexChar(parser, len, throwOnInvalid) {
    const start = parser.state.index;
    const n = readInt(parser, 16, len);
    if (n === undefined) {
        if (throwOnInvalid) {
            parser.addDiagnostic({
                index: start,
                description: diagnostics_1.descriptions.JS_PARSER.BAD_HEX_ESCAPE,
            });
            return 0;
        }
        const codePos = parser.state.index;
        parser.state.index = ob1_1.ob1Dec(codePos);
        parser.state.invalidTemplateEscapePosition = ob1_1.ob1Dec(codePos);
    }
    return n;
}
// Read an identifier, and return it as a string. Sets `parser.state.escapePosition`
// to an index if the word contained a '\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.
function readWord1(parser) {
    parser.state.escapePosition = undefined;
    let word = '';
    let first = true;
    let chunkStart = parser.state.index;
    while (parser.state.index < parser.length) {
        const ch = fullCharCodeAtPos(parser);
        if (js_parser_utils_1.isIdentifierChar(ch)) {
            parser.state.index = ob1_1.ob1Add(parser.state.index, ch <= 65535 ? 1 : 2);
        }
        else if (parser.state.isIterator && ch === charCodes.atSign) {
            bumpIndex(parser);
        }
        else if (ch === charCodes.backslash) {
            parser.state.escapePosition = parser.state.index;
            word += parser.getRawInput(chunkStart, parser.state.index);
            if (parser.input.charCodeAt(ob1_1.ob1Get0(bumpIndex(parser))) !==
                charCodes.lowercaseU) {
                parser.addDiagnostic({
                    index: parser.state.index,
                    description: diagnostics_1.descriptions.JS_PARSER.EXPECTED_UNICODE_ESCAPE,
                });
            }
            bumpIndex(parser);
            const esc = readCodePoint(parser, true);
            if (esc === undefined) {
                throw new Error('readCodePoint() should have thrown an error');
            }
            const isValid = first ? js_parser_utils_1.isIdentifierStart : js_parser_utils_1.isIdentifierChar;
            if (isValid(esc) === false) {
                parser.addDiagnostic({
                    index: parser.state.index,
                    description: diagnostics_1.descriptions.JS_PARSER.INVALID_UNICODE_ESCAPE,
                });
            }
            word += codePointToString(esc);
            chunkStart = parser.state.index;
        }
        else {
            break;
        }
        first = false;
    }
    return word + parser.getRawInput(chunkStart, parser.state.index);
}
// Read an identifier or keyword token. Will check for reserved
// words when necessary.
function readWord(parser) {
    const word = readWord1(parser);
    // @ts-ignore: The value of keywordTypes has a generic parameter of `string` instead of the labels that we would actually find in keywordTypes
    let type = types_1.keywords.get(word) || types_1.types.name;
    if (type.keyword !== undefined && parser.state.escapePosition !== undefined) {
        parser.addDiagnostic({
            index: parser.state.escapePosition,
            description: diagnostics_1.descriptions.JS_PARSER.ESCAPE_SEQUENCE_IN_KEYWORD(word),
        });
    }
    if (parser.state.isIterator && (!isIterator(word) || !parser.inScope('TYPE'))) {
        parser.addDiagnostic({
            description: diagnostics_1.descriptions.JS_PARSER.INVALID_IDENTIFIER_NAME(word),
        });
    }
    finishToken(parser, type, word);
}
function isIterator(word) {
    return word === '@@iterator' || word === '@@asyncIterator';
}
function isBraceBlock(parser, prevType) {
    const parent = getCurContext(parser);
    if (parent === context_1.types.functionExpression || parent === context_1.types.functionStatement) {
        return true;
    }
    if (prevType === types_1.types.colon &&
        (parent === context_1.types.braceStatement || parent === context_1.types.braceExpression)) {
        return !parent.isExpr;
    }
    // The check for `tt.name && exprAllowed` detects whether we are
    // after a `yield` or `of` construct. See the `updateContext` for
    // `tt.name`.
    if (prevType === types_1.types._return ||
        (prevType === types_1.types.name && parser.state.exprAllowed)) {
        return js_parser_utils_1.lineBreak.test(parser.getRawInput(parser.state.lastEndPos.index, parser.state.startPos.index));
    }
    if (prevType === types_1.types._else ||
        prevType === types_1.types.semi ||
        prevType === types_1.types.eof ||
        prevType === types_1.types.parenR ||
        prevType === types_1.types.arrow) {
        return true;
    }
    if (prevType === types_1.types.braceL) {
        return parent === context_1.types.braceStatement;
    }
    if (prevType === types_1.types._var || prevType === types_1.types.name || prevType === types_1.types._const) {
        return false;
    }
    if (prevType === types_1.types.relational) {
        // `class C<T> { ... }`
        return true;
    }
    return !parser.state.exprAllowed;
}
exports.isBraceBlock = isBraceBlock;
function updateContext(parser, prevType) {
    if (parser.match(types_1.types.braceL)) {
        const curContext = getCurContext(parser);
        if (curContext === context_1.types.jsxOpenTag) {
            parser.state.context.push(context_1.types.braceExpression);
        }
        else if (curContext === context_1.types.jsxInner) {
            parser.state.context.push(context_1.types.templateQuasi);
        }
        else {
            _updateContext(parser, prevType);
        }
        parser.state.exprAllowed = true;
    }
    else if (parser.match(types_1.types.slash) && prevType === types_1.types.jsxTagStart) {
        parser.state.context.length -= 2; // do not consider JSX expr -> JSX open tag -> ... anymore
        parser.state.context.push(context_1.types.jsxCloseTag); // reconsider as closing tag context
        parser.state.exprAllowed = false;
    }
    else {
        _updateContext(parser, prevType);
    }
}
function _updateContext(parser, prevType) {
    const type = parser.state.tokenType;
    if (type.keyword !== undefined &&
        (prevType === types_1.types.dot || prevType === types_1.types.questionDot)) {
        parser.state.exprAllowed = false;
    }
    else if (type.updateContext !== undefined) {
        type.updateContext(parser, prevType);
    }
    else {
        parser.state.exprAllowed = type.beforeExpr;
    }
}
// Reads inline JSX contents token.
function readTokenJsx(parser) {
    let out = '';
    let chunkStart = parser.state.index;
    while (true) {
        if (parser.state.index >= parser.length) {
            finishToken(parser, types_1.types.eof);
            break;
        }
        const code = parser.input.charCodeAt(getIndex(parser));
        if (code === charCodes.lessThan || code === charCodes.leftCurlyBrace) {
            if (parser.state.index === parser.state.startPos.index) {
                if (code === charCodes.lessThan && parser.state.exprAllowed) {
                    bumpIndex(parser);
                    return finishToken(parser, types_1.types.jsxTagStart);
                }
                return getTokenFromCode(parser, code);
            }
            out += parser.getRawInput(chunkStart, parser.state.index);
            return finishToken(parser, types_1.types.jsxText, out);
        }
        if (code === charCodes.ampersand) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            out += readTokenJsxEntity(parser);
            chunkStart = parser.state.index;
            continue;
        }
        if (js_parser_utils_1.isNewLine(code)) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            out += readTokenJsxNewLine(parser, true);
            chunkStart = parser.state.index;
        }
        else {
            bumpIndex(parser);
        }
    }
}
function readTokenJsxNewLine(parser, normalizeCRLF) {
    const ch = parser.input.charCodeAt(getIndex(parser));
    let out;
    bumpIndex(parser);
    if (ch === charCodes.carriageReturn &&
        parser.input.charCodeAt(getIndex(parser)) === charCodes.lineFeed) {
        bumpIndex(parser);
        out = normalizeCRLF ? '\n' : '\r\n';
    }
    else {
        out = String.fromCharCode(ch);
    }
    parser.state.curLine = ob1_1.ob1Inc(parser.state.curLine);
    parser.resetTokenizerLine();
    return out;
}
function readTokenJsxString(parser, quote) {
    let out = '';
    let chunkStart = bumpIndex(parser);
    while (true) {
        if (parser.state.index >= parser.length) {
            parser.addDiagnostic({
                end: parser.getPositionFromIndex(parser.state.index),
                description: diagnostics_1.descriptions.JS_PARSER.UNTERMINATED_JSX_STRING,
            });
            break;
        }
        const ch = parser.input.charCodeAt(getIndex(parser));
        if (ch === quote) {
            break;
        }
        if (ch === charCodes.ampersand) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            out += readTokenJsxEntity(parser);
            chunkStart = parser.state.index;
        }
        else if (js_parser_utils_1.isNewLine(ch)) {
            out += parser.getRawInput(chunkStart, parser.state.index);
            out += readTokenJsxNewLine(parser, false);
            chunkStart = parser.state.index;
        }
        else {
            bumpIndex(parser);
        }
    }
    out += parser.getRawInput(chunkStart, parser.state.index);
    bumpIndex(parser);
    return finishToken(parser, types_1.types.string, out);
}
function readTokenJsxEntity(parser) {
    let str = '';
    let count = 0;
    let entity;
    let ch = parser.input[getIndex(parser)];
    const startIndex = bumpIndex(parser);
    while (parser.state.index < parser.length && count++ < 10) {
        ch = parser.input[getIndex(parser)];
        bumpIndex(parser);
        if (ch === ';') {
            if (str[0] === '#') {
                if (str[1] === 'x') {
                    str = str.substr(2);
                    if (HEX_NUMBER.test(str)) {
                        entity = String.fromCodePoint(parseInt(str, 16));
                    }
                }
                else {
                    str = str.substr(1);
                    if (DECIMAL_NUMBER.test(str)) {
                        entity = String.fromCodePoint(parseInt(str, 10));
                    }
                }
            }
            else {
                entity = xhtmlEntities_1.xhtmlEntityNameToChar[str];
            }
            break;
        }
        str += ch;
    }
    if (entity === undefined) {
        parser.state.index = startIndex;
        return '&';
    }
    else {
        return entity;
    }
}
// Read a JSX identifier (valid tag or attribute name).
//
// Optimized version since JSX identifiers can't contain
// escape characters and so can be read as single slice.
// Also assumes that first character was already checked
// by isIdentifierStart in readToken.
function readTokenJsxWord(parser) {
    let ch;
    const start = parser.state.index;
    do {
        ch = parser.input.charCodeAt(ob1_1.ob1Get0(bumpIndex(parser)));
    } while (js_parser_utils_1.isIdentifierChar(ch) || ch === charCodes.dash);
    return finishToken(parser, types_1.types.jsxName, parser.getRawInput(start, parser.state.index));
}
