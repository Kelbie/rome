"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parser_core_1 = require("@romejs/parser-core");
const ob1_1 = require("@romejs/ob1");
const diagnostics_1 = require("@romejs/diagnostics");
const createPathMatchParser = parser_core_1.createParser((ParserCore) => class PathMatchParser extends ParserCore {
    constructor(opts, mode) {
        super(opts, 'parse/patchMatch');
        this.mode = mode;
    }
    isWordCharacter(char, index, input) {
        const prevChar = input[ob1_1.ob1Get0(index) - 1];
        const nextChar = input[ob1_1.ob1Get0(index) + 1];
        // Windows separator
        if (char === '\\' && nextChar === '\\') {
            return false;
        }
        // Any escaped character is a word character
        if (prevChar === '\\') {
            return true;
        }
        // Unix separator and wildcard
        if (char === '/') {
            return false;
        }
        if (this.mode === 'pattern') {
            // Wildcard
            if (char === '*') {
                return false;
            }
            // Comment
            if (char === '#') {
                return false;
            }
        }
        return true;
    }
    tokenize(index, input) {
        const char = input[ob1_1.ob1Get0(index)];
        const nextChar = input[ob1_1.ob1Get0(index) + 1];
        if (this.mode === 'pattern') {
            if (char === '*') {
                if (nextChar === '*') {
                    return this.finishToken('DoubleStar', ob1_1.ob1Add(index, 2));
                }
                else {
                    return this.finishToken('Star');
                }
            }
            else if (index === ob1_1.ob1Number0 && char === '!') {
                return this.finishToken('Exclamation');
            }
            else if (char === '#') {
                return this.finishToken('Hash');
            }
        }
        if (char === '/') {
            return this.finishToken('Separator');
        }
        else if (char === '\\' && nextChar === '\\') {
            return this.finishToken('Separator', ob1_1.ob1Add(index, 2));
        }
        const [value, end] = this.readInputFrom(index, this.isWordCharacter.bind(this));
        return this.finishValueToken('Word', value, end);
    }
    eatSeparators() {
        let ate = false;
        while (this.eatToken('Separator') !== undefined) {
            ate = true;
        }
        return ate;
    }
    //# Pattern parsing
    parsePatternSegmentPart() {
        const startPos = this.getPosition();
        const token = this.getToken();
        this.nextToken();
        switch (token.type) {
            case 'Star':
                return {
                    type: 'Wildcard',
                    loc: this.finishLoc(startPos),
                };
            case 'Word':
                return {
                    type: 'Word',
                    loc: this.finishLoc(startPos),
                    value: token.value,
                };
            default:
                throw this.unexpected({
                    start: startPos,
                    description: diagnostics_1.descriptions.PATH_MATCH.INVALID_PATTERN_SEGMENT_PART,
                });
        }
    }
    parseSegment() {
        const startPos = this.getPosition();
        const parts = [];
        // A ** token is only allowed as the only part of a segment
        if (this.matchToken('DoubleStar')) {
            const lookahead = this.lookaheadToken();
            if (lookahead.type === 'Separator' || lookahead.type === 'EOF') {
                this.eatToken('DoubleStar');
                this.eatSeparators();
                return {
                    type: 'WildcardSegment',
                    loc: this.finishLoc(startPos),
                };
            }
        }
        // Keep consuming tokens until we hit a separator or a comment
        while (!this.matchToken('Hash') &&
            !this.matchToken('EOF') &&
            !this.eatSeparators()) {
            parts.push(this.parsePatternSegmentPart());
        }
        return {
            loc: this.finishLoc(startPos),
            type: 'Segment',
            parts,
        };
    }
    isWildcardOnlySegment(segment) {
        if (segment === undefined) {
            return false;
        }
        if (segment.type === 'WildcardSegment') {
            return true;
        }
        if (segment.parts.length === 1 && segment.parts[0].type === 'Wildcard') {
            return true;
        }
        return false;
    }
    // Normalize all path segments, removing empty segments and wildcards from the start and end
    // These could also be parse errors but let's allow them
    normalizePatternSegments(segments) {
        const normalized = [];
        // Never normalize it if there's a single segment. This is to support writing a pattern that's just "*"
        if (segments.length === 1) {
            return segments;
        }
        for (const seg of segments) {
            // Remove all wildcard-only segments from 'beginning
            if (normalized.length === 0 && this.isWildcardOnlySegment(seg)) {
                continue;
            }
            // Remove all empty segments
            if (seg.type === 'Segment' && seg.parts.length === 0) {
                continue;
            }
            normalized.push(seg);
        }
        // TODO Remove duplicate wildcard segments
        // - Multiple WildcardSegment
        // - Wildcard next to a WildcardSegment
        // Remove all wildcard-only segments from end
        while (this.isWildcardOnlySegment(normalized[normalized.length - 1])) {
            normalized.pop();
        }
        return normalized;
    }
    parsePatternsFile() {
        const patterns = [];
        while (!this.matchToken('EOF')) {
            patterns.push(this.parsePattern());
        }
        return patterns;
    }
    parsePattern() {
        const startPos = this.getPosition();
        const segments = [];
        const negate = this.eatToken('Exclamation') !== undefined;
        // Keep parsing segments until we hit the end of the input or a comment
        while (!this.matchToken('Hash') && !this.matchToken('EOF')) {
            segments.push(this.parseSegment());
        }
        // Get a trailing comment
        let comment = '';
        if (this.eatToken('Hash')) {
            comment = this.getRawInput(this.getToken().start, ob1_1.ob1Coerce0(this.input.length));
        }
        let root = false;
        if (segments.length > 0) {
            const firstSeg = segments[0];
            root = firstSeg.type === 'Segment' && firstSeg.parts.length === 0;
        }
        return {
            type: 'PathPattern',
            loc: this.finishLoc(startPos),
            root,
            comment,
            negate,
            segments: this.normalizePatternSegments(segments),
        };
    }
    //# Path parsing
    parsePath() {
        const segments = [];
        this.eatSeparators();
        while (!this.matchToken('EOF')) {
            segments.push(this.parsePathSegment());
        }
        return segments;
    }
    parsePathSegment() {
        let segment = '';
        while (!this.eatSeparators() && !this.matchToken('EOF')) {
            segment += this.normalizePathSegmentToken();
        }
        return segment;
    }
    normalizePathSegmentToken() {
        const token = this.getToken();
        this.nextToken();
        if (token.type === 'Word') {
            return token.value;
        }
        else {
            throw this.unexpected({
                description: diagnostics_1.descriptions.PATH_MATCH.INVALID_PATH_SEGMENT,
            });
        }
    }
});
function parsePattern(opts) {
    const parser = createPathMatchParser(opts, 'pattern');
    return parser.parsePattern();
}
exports.parsePattern = parsePattern;
function parsePatternsFile(opts) {
    const parser = createPathMatchParser(opts, 'pattern');
    return parser.parsePatternsFile();
}
exports.parsePatternsFile = parsePatternsFile;
