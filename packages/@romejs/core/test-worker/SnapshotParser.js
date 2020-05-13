"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parser_core_1 = require("@romejs/parser-core");
const string_utils_1 = require("@romejs/string-utils");
const ob1_1 = require("@romejs/ob1");
const diagnostics_1 = require("@romejs/diagnostics");
function isHash(char) {
    return char === '#';
}
function isCodeBlockEnd(index, input) {
    return (input[ob1_1.ob1Get0(index)] === '`' &&
        !string_utils_1.isEscaped(index, input) &&
        input[ob1_1.ob1Get0(ob1_1.ob1Add(index, 1))] === '`' &&
        input[ob1_1.ob1Get0(ob1_1.ob1Add(index, 2))] === '`');
}
function isInCodeBlock(char, index, input) {
    return !isCodeBlockEnd(index, input);
}
function isntNewline(char) {
    return char !== '\n';
}
function unescapeTicks(code) {
    return code;
}
exports.createSnapshotParser = parser_core_1.createParser((ParserCore) => class SnapshotParser extends ParserCore {
    constructor(opts) {
        super(opts, 'parse/snapshots');
        this.ignoreWhitespaceTokens = true;
    }
    tokenize(index, input) {
        const char = input[ob1_1.ob1Get0(index)];
        switch (char) {
            case '#': {
                const [hashes] = this.readInputFrom(index, isHash);
                const level = hashes.length;
                return this.finishValueToken('Hashes', level, ob1_1.ob1Add(index, level));
            }
            case '`': {
                const nextChar = input[ob1_1.ob1Get0(ob1_1.ob1Add(index, 1))];
                const nextNextChar = input[ob1_1.ob1Get0(ob1_1.ob1Add(index, 2))];
                if (nextChar === '`' && nextNextChar === '`') {
                    let codeOffset = ob1_1.ob1Add(index, 3);
                    let language;
                    if (input[ob1_1.ob1Get0(codeOffset)] !== '\n') {
                        [language, codeOffset] = this.readInputFrom(codeOffset, isntNewline);
                    }
                    // Expect the first offset character to be a newline
                    if (input[ob1_1.ob1Get0(codeOffset)] === '\n') {
                        // Skip leading newline
                        codeOffset = ob1_1.ob1Add(codeOffset, 1);
                    }
                    else {
                        throw this.unexpected({
                            description: diagnostics_1.descriptions.SNAPSHOTS.MISSING_NEWLINE_AFTER_CODE_BLOCK,
                            start: this.getPositionFromIndex(codeOffset),
                        });
                    }
                    let [code] = this.readInputFrom(codeOffset, isInCodeBlock);
                    let end = ob1_1.ob1Add(codeOffset, code.length);
                    if (isCodeBlockEnd(end, input)) {
                        // Check for trailing newline
                        if (code[code.length - 1] === '\n') {
                            // Trim trailing newline
                            code = code.slice(0, -1);
                            // Skip closing ticks
                            end = ob1_1.ob1Add(end, 3);
                            return this.finishValueToken('CodeBlock', {
                                language,
                                text: unescapeTicks(code),
                            }, end);
                        }
                        else {
                            throw this.unexpected({
                                description: diagnostics_1.descriptions.SNAPSHOTS.MISSING_NEWLINE_BEFORE_CODE_BLOCK,
                                start: this.getPositionFromIndex(end),
                            });
                        }
                    }
                    else {
                        throw this.unexpected({
                            description: diagnostics_1.descriptions.SNAPSHOTS.UNCLOSED_CODE_BLOCK,
                            start: this.getPositionFromIndex(end),
                        });
                    }
                }
            }
        }
        const [text, end] = this.readInputFrom(index, isntNewline);
        return this.finishValueToken('TextLine', text, end);
    }
    parse() {
        const nodes = [];
        while (!this.matchToken('EOF')) {
            const start = this.getPosition();
            const token = this.getToken();
            switch (token.type) {
                case 'Hashes': {
                    const level = token.value;
                    this.nextToken();
                    const text = this.expectToken('TextLine').value;
                    nodes.push({
                        type: 'Heading',
                        level,
                        text,
                        loc: this.finishLoc(start),
                    });
                    break;
                }
                case 'CodeBlock': {
                    nodes.push({
                        type: 'CodeBlock',
                        ...token.value,
                        loc: this.finishLoc(start),
                    });
                    this.nextToken();
                    break;
                }
                case 'TextLine': {
                    nodes.push({
                        type: 'TextLine',
                        text: token.value,
                        loc: this.finishLoc(start),
                    });
                    this.nextToken();
                    break;
                }
                default:
                    throw this.unexpected();
            }
        }
        return nodes;
    }
});
