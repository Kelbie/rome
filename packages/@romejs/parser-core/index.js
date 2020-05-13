"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
const path_1 = require("@romejs/path");
const string_utils_1 = require("@romejs/string-utils");
__export(require("./types"));
function tryParseWithOptionalOffsetPosition(parserOpts, opts) {
    const { value } = diagnostics_1.catchDiagnosticsSync(() => {
        return opts.parse(parserOpts);
    });
    if (value === undefined) {
        // Diagnostics must be present
        opts.parse({
            ...parserOpts,
            offsetPosition: opts.getOffsetPosition(),
        });
        throw new Error('Expected error');
    }
    else {
        return value;
    }
}
exports.tryParseWithOptionalOffsetPosition = tryParseWithOptionalOffsetPosition;
const SOF_TOKEN = {
    type: 'SOF',
    start: ob1_1.ob1Number0,
    end: ob1_1.ob1Number0,
};
function normalizeInput(opts) {
    const { input } = opts;
    if (input === undefined) {
        return '';
    }
    else if (opts.retainCarriageReturn) {
        return input;
    }
    else {
        return string_utils_1.removeCarriageReturn(input);
    }
}
class ParserCore {
    constructor(opts, diagnosticCategory, initialState) {
        const { path, mtime, offsetPosition } = opts;
        // Input information
        this.path = path === undefined ? undefined : path_1.createUnknownFilePath(path);
        this.filename = this.path === undefined ? undefined : this.path.join();
        this.mtime = mtime;
        this.input = normalizeInput(opts);
        this.length = ob1_1.ob1Coerce0(this.input.length);
        this.eofToken = {
            type: 'EOF',
            start: ob1_1.ob1Coerce0(this.input.length),
            end: ob1_1.ob1Coerce0(this.input.length),
        };
        // Parser/tokenizer state
        this.offsetPosition = offsetPosition;
        this.diagnosticCategory = diagnosticCategory;
        this.tokenizing = false;
        this.currLine =
            offsetPosition === undefined ? ob1_1.ob1Number1 : offsetPosition.line;
        this.currColumn =
            offsetPosition === undefined ? ob1_1.ob1Number0 : offsetPosition.column;
        this.nextTokenIndex = ob1_1.ob1Number0;
        this.currentToken = SOF_TOKEN;
        this.prevToken = SOF_TOKEN;
        this.state = initialState;
        this.ignoreWhitespaceTokens = false;
        this.indexTracker = new PositionTracker(this.input, offsetPosition, this.getPosition.bind(this));
    }
    getPathAssert() {
        const { path } = this;
        if (path === undefined) {
            throw new Error('Path expected but none was passed to this Parser');
        }
        else {
            return path;
        }
    }
    getFilenameAssert() {
        const { filename } = this;
        if (filename === undefined) {
            throw new Error('Filename expected but none was passed to this Parser');
        }
        else {
            return filename;
        }
    }
    // Run the tokenizer over all tokens
    tokenizeAll() {
        const tokens = [];
        const { diagnostics } = diagnostics_1.catchDiagnosticsSync(() => {
            while (!this.matchToken('EOF')) {
                tokens.push(this.getToken());
                this.nextToken();
            }
        });
        if (diagnostics !== undefined) {
            tokens.push({
                type: 'Invalid',
                start: this.nextTokenIndex,
                end: this.length,
            });
        }
        return tokens;
    }
    // Tokenize method that must be implemented by subclasses
    tokenize(index, input) {
        throw new Error('Unimplemented');
    }
    // Alternate tokenize method to allow that allows the use of state
    tokenizeWithState(index, input, state) {
        const token = this.tokenize(index, input);
        if (token !== undefined) {
            return { token, state };
        }
        else {
            return undefined;
        }
    }
    _tokenizeWithState(index, input, state) {
        if (this.ignoreWhitespaceTokens) {
            switch (input[ob1_1.ob1Get0(index)]) {
                case ' ':
                case '\t':
                case '\r':
                case '\n':
                    return this.lookahead(ob1_1.ob1Inc(index));
            }
        }
        return this.tokenizeWithState(index, input, state);
    }
    // Get the current token
    getToken() {
        const { currentToken } = this;
        if (currentToken === SOF_TOKEN) {
            return this.nextToken();
        }
        else {
            return currentToken;
        }
    }
    getPrevToken() {
        return this.prevToken;
    }
    save() {
        return {
            nextTokenIndex: this.nextTokenIndex,
            currentToken: this.currentToken,
            prevToken: this.prevToken,
            state: this.state,
        };
    }
    restore(snapshot) {
        this.nextTokenIndex = snapshot.nextTokenIndex;
        this.currentToken = snapshot.currentToken;
        this.prevToken = snapshot.prevToken;
        this.state = snapshot.state;
    }
    // Advance to the next token, returning the new one
    nextToken() {
        if (this.isEOF(this.nextTokenIndex)) {
            this.currentToken = this.eofToken;
            return this.eofToken;
        }
        if (this.tokenizing) {
            throw new Error("Can't call nextToken while tokenizing");
        }
        const prevToken = this.currentToken;
        const { token: nextToken, state } = this.lookahead();
        if (nextToken.end === prevToken.end) {
            throw new Error(`tokenize() returned a token with the same position as the last - Previous token: ${JSON.stringify(prevToken)}; Next token: ${JSON.stringify(nextToken)}; Input: ${this.input.slice(0, 100)}`);
        }
        const { line, column } = this.getPositionFromIndex(nextToken.start);
        this.currLine = line;
        this.currColumn = column;
        this.nextTokenIndex = nextToken.end;
        this.prevToken = prevToken;
        this.currentToken = nextToken;
        this.state = state;
        return nextToken;
    }
    // Get the position of the current token
    getPosition() {
        const index = this.currentToken.start;
        const cached = this.indexTracker.cachedPositions.get(index);
        if (cached !== undefined) {
            return cached;
        }
        const pos = {
            index: this.indexTracker.addOffset(index),
            line: this.currLine,
            column: this.currColumn,
        };
        this.indexTracker.cachedPositions.set(index, pos);
        return pos;
    }
    // Get the end position of the current token
    getLastEndPosition() {
        return this.getPositionFromIndex(this.prevToken.end);
    }
    // Return the token that's after this current token without advancing to it
    lookaheadToken(index) {
        return this.lookahead(index).token;
    }
    // Return the token and state that's after the current token without advancing to it
    lookahead(index = this.nextTokenIndex) {
        if (this.isEOF(index)) {
            return { token: this.eofToken, state: this.state };
        }
        // Set the next token index, in the case of a lookahead we'll set it back later
        const prevNextTokenIndex = this.nextTokenIndex;
        this.nextTokenIndex = index;
        // Indicate that we're currently tokenizing to catch some weird recursive tokenizing errors
        const wasTokenizing = this.tokenizing;
        this.tokenizing = true;
        // Tokenize and do some validation
        const nextToken = this._tokenizeWithState(index, this.input, this.state);
        if (nextToken === undefined) {
            throw this.unexpected({
                start: this.getPositionFromIndex(index),
            });
        }
        // Reset to old values
        this.tokenizing = wasTokenizing;
        this.nextTokenIndex = prevNextTokenIndex;
        return nextToken;
    }
    getPositionFromIndex(index) {
        return this.indexTracker.getPositionFromIndex(index);
    }
    createDiagnostic(opts = {}) {
        const { currentToken } = this;
        let { description: metadata, start, end, loc, token } = opts;
        // Allow passing in a TokenBase
        if (token !== undefined) {
            start = this.getPositionFromIndex(token.start);
            end = this.getPositionFromIndex(token.end);
        }
        // Allow passing in a SourceLocation as an easy way to point to a particular node
        if (loc !== undefined) {
            start = loc.start;
            end = loc.end;
        }
        // When both properties are omitted then we will default to the current token range
        if (start === undefined && end === undefined) {
            end = this.getLastEndPosition();
        }
        if (start === undefined) {
            start = this.getPosition();
        }
        if (end === undefined) {
            end = start;
        }
        // Sometimes the end position may be empty as it hasn't been filled yet
        if (end.index === ob1_1.ob1Number0) {
            end = start;
        }
        // Normalize message, we need to be defensive here because it could have been called while tokenizing the first token
        if (metadata === undefined) {
            if (currentToken !== undefined &&
                start !== undefined &&
                start.index === currentToken.start) {
                metadata = diagnostics_1.descriptions.PARSER_CORE.UNEXPECTED(currentToken.type);
            }
            else {
                if (this.isEOF(start.index)) {
                    metadata = diagnostics_1.descriptions.PARSER_CORE.UNEXPECTED_EOF;
                }
                else {
                    const char = this.input[ob1_1.ob1Get0(start.index)];
                    metadata = diagnostics_1.descriptions.PARSER_CORE.UNEXPECTED_CHARACTER(char);
                }
            }
        }
        const metadataWithCategory = {
            ...metadata,
            category: metadata.category === undefined
                ? this.diagnosticCategory
                : metadata.category,
        };
        return {
            description: metadataWithCategory,
            location: {
                sourceText: this.path === undefined ? this.input : undefined,
                mtime: this.mtime,
                start,
                end,
                filename: this.filename,
            },
        };
    }
    // Return an error to indicate a parser error, this must be thrown at the callsite for refinement
    unexpected(opts = {}) {
        return diagnostics_1.createSingleDiagnosticError(this.createDiagnostic(opts));
    }
    //# Token utility methods
    assertNoSpace() {
        if (this.currentToken.start !== this.prevToken.end) {
            throw this.unexpected({
                description: diagnostics_1.descriptions.PARSER_CORE.EXPECTED_SPACE,
            });
        }
    }
    // If the current token is the specified type then return the next token, otherwise return null
    eatToken(type) {
        if (this.matchToken(type)) {
            return this.nextToken();
        }
        else {
            return undefined;
        }
    }
    didEatToken(type) {
        return this.eatToken(type) !== undefined;
    }
    // Check if we're at the end of the input
    isEOF(index) {
        return ob1_1.ob1Get0(index) >= this.input.length;
    }
    // Check if the current token matches the input type
    matchToken(type) {
        return this.getToken().type === type;
    }
    // Get the current token and assert that it's of the specified type, the token stream will also be advanced
    expectToken(type, _metadata) {
        const token = this.getToken();
        if (token.type === type) {
            this.nextToken();
            // @ts-ignore
            return token;
        }
        else {
            throw this.unexpected({
                description: _metadata === undefined
                    ? diagnostics_1.descriptions.PARSER_CORE.EXPECTED_TOKEN(token.type, type)
                    : _metadata,
            });
        }
    }
    // Read from the input starting at the specified index, until the callback returns false
    readInputFrom(index, callback) {
        const { input } = this;
        let value = '';
        while (true) {
            if (ob1_1.ob1Get0(index) >= input.length) {
                return [value, index, true];
            }
            if (callback === undefined ||
                callback(input[ob1_1.ob1Get0(index)], index, input)) {
                value += input[ob1_1.ob1Get0(index)];
                index = ob1_1.ob1Inc(index);
            }
            else {
                break;
            }
        }
        return [value, index, false];
    }
    // Get the string between the specified range
    getRawInput(start, end) {
        return this.input.slice(ob1_1.ob1Get0(start), ob1_1.ob1Get0(end));
    }
    //# Utility methods to make it easy to construct nodes or tokens
    getLoc(node) {
        if (node === undefined || node.loc === undefined) {
            throw new Error('Tried to fetch node loc start but none found');
        }
        else {
            return node.loc;
        }
    }
    finishToken(type, end = ob1_1.ob1Inc(this.nextTokenIndex)) {
        return {
            type,
            start: this.nextTokenIndex,
            end,
        };
    }
    finishValueToken(type, value, end = ob1_1.ob1Inc(this.nextTokenIndex)) {
        return {
            type,
            value,
            start: this.nextTokenIndex,
            end,
        };
    }
    finishComplexToken(type, data, end = ob1_1.ob1Inc(this.nextTokenIndex)) {
        return {
            type,
            ...data,
            start: this.nextTokenIndex,
            end,
        };
    }
    finishLocFromToken(token) {
        return this.finishLocAt(this.getPositionFromIndex(token.start), this.getPositionFromIndex(token.end));
    }
    finishLoc(start) {
        return this.finishLocAt(start, this.getLastEndPosition());
    }
    finishLocAt(start, end) {
        return {
            filename: this.filename,
            start,
            end,
        };
    }
    finalize() {
        if (!this.eatToken('EOF')) {
            throw this.unexpected({
                description: diagnostics_1.descriptions.PARSER_CORE.EXPECTED_EOF,
            });
        }
    }
}
exports.ParserCore = ParserCore;
class ParserWithRequiredPath extends ParserCore {
    constructor(opts, diagnosticCategory, initialState) {
        super(opts, diagnosticCategory, initialState);
        this.filename = this.getFilenameAssert();
        this.path = this.getPathAssert();
    }
}
exports.ParserWithRequiredPath = ParserWithRequiredPath;
class PositionTracker {
    constructor(input, offsetPosition = {
        line: ob1_1.ob1Number1,
        column: ob1_1.ob1Number0,
        index: ob1_1.ob1Number0,
    }, getPosition) {
        this.getPosition = getPosition;
        this.input = input;
        this.offsetPosition = offsetPosition;
        this.latestPosition = offsetPosition;
        this.cachedPositions = new Map();
    }
    addOffset(index) {
        return ob1_1.ob1Add(index, this.offsetPosition.index);
    }
    removeOffset(index) {
        return ob1_1.ob1Sub(index, this.offsetPosition.index);
    }
    getPositionFromIndex(index) {
        const cached = this.cachedPositions.get(index);
        if (cached !== undefined) {
            return cached;
        }
        let line = ob1_1.ob1Number1;
        let column = ob1_1.ob1Number0;
        let indexSearchWithoutOffset = 0;
        const indexWithOffset = this.addOffset(index);
        // Reuse existing line information if possible
        const { latestPosition } = this;
        const currPosition = this.getPosition === undefined ? undefined : this.getPosition();
        if (currPosition !== undefined &&
            currPosition.index > latestPosition.index &&
            currPosition.index < indexWithOffset) {
            line = currPosition.line;
            column = currPosition.column;
            indexSearchWithoutOffset = ob1_1.ob1Get0(this.removeOffset(currPosition.index));
        }
        else if (latestPosition.index < indexWithOffset) {
            line = latestPosition.line;
            column = latestPosition.column;
            indexSearchWithoutOffset = ob1_1.ob1Get0(this.removeOffset(latestPosition.index));
        }
        // Read the rest of the input until we hit the index
        for (let i = indexSearchWithoutOffset; i < ob1_1.ob1Get0(index); i++) {
            const char = this.input[i];
            if (char === '\n') {
                line = ob1_1.ob1Inc(line);
                column = ob1_1.ob1Number0;
            }
            else {
                column = ob1_1.ob1Inc(column);
            }
        }
        const pos = {
            index: indexWithOffset,
            line,
            column,
        };
        if (latestPosition === undefined || pos.index > latestPosition.index) {
            this.latestPosition = pos;
        }
        this.cachedPositions.set(index, pos);
        return pos;
    }
}
exports.PositionTracker = PositionTracker;
//# Helpers methods for basic token parsing
function isDigit(char) {
    return char !== undefined && /[0-9]/.test(char);
}
exports.isDigit = isDigit;
function isAlpha(char) {
    return char !== undefined && /[A-Za-z]/.test(char);
}
exports.isAlpha = isAlpha;
function isHexDigit(char) {
    return char !== undefined && /[0-9A-Fa-f]/.test(char);
}
exports.isHexDigit = isHexDigit;
function isESIdentifierChar(char) {
    return char !== undefined && /[A-F0-9a-z_$]/.test(char);
}
exports.isESIdentifierChar = isESIdentifierChar;
function isESIdentifierStart(char) {
    return char !== undefined && /[A-Fa-z_$]/.test(char);
}
exports.isESIdentifierStart = isESIdentifierStart;
function readUntilLineBreak(char) {
    return char !== '\n';
}
exports.readUntilLineBreak = readUntilLineBreak;
// Lazy initialize a ParserCore subclass... Circular dependencies are wild and necessitate this as ParserCore may not be available
function createParser(callback) {
    let klass;
    return (...args) => {
        if (klass === undefined) {
            klass = callback(ParserCore, ParserWithRequiredPath);
        }
        return new klass(...args);
    };
}
exports.createParser = createParser;
// Utility methods for dealing with nodes
function extractSourceLocationRangeFromNodes(nodes) {
    if (nodes.length === 0) {
        return undefined;
    }
    let filename = undefined;
    let start = undefined;
    let end = undefined;
    for (const node of nodes) {
        const { loc } = node;
        if (loc === undefined) {
            continue;
        }
        if (start === undefined || loc.start.index < start.index) {
            start = loc.start;
        }
        if (end === undefined || loc.end.index > end.index) {
            end = loc.end;
        }
        if (filename === undefined) {
            filename = loc.filename;
        }
        else if (filename !== loc.filename) {
            throw new Error(`Mixed filenames in node, expected ${filename} but got ${loc.filename}`);
        }
    }
    if (start === undefined || end === undefined) {
        return undefined;
    }
    return {
        filename,
        start,
        end,
    };
}
exports.extractSourceLocationRangeFromNodes = extractSourceLocationRangeFromNodes;
