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
const escape_1 = require("./escape");
const globalAttributes = ['emphasis', 'dim'];
// Tags and their corresponding supported attributes
const tags = new Map();
tags.set('emphasis', []);
tags.set('number', ['approx', 'pluralSuffix', 'singularSuffix']);
tags.set('grammarNumber', ['plural', 'singular', 'none']);
tags.set('hyperlink', ['target']);
tags.set('filelink', ['target', 'column', 'line']);
tags.set('inverse', []);
tags.set('dim', []);
tags.set('filesize', []);
tags.set('duration', ['approx']);
tags.set('italic', []);
tags.set('underline', []);
tags.set('strike', []);
tags.set('error', []);
tags.set('success', []);
tags.set('warn', []);
tags.set('info', []);
tags.set('command', []);
tags.set('color', ['fg', 'bg']);
tags.set('highlight', ['i']);
tags.set('table', []);
tags.set('tr', []);
tags.set('td', ['align']);
tags.set('hr', []);
tags.set('pad', ['width', 'align']);
tags.set('nobr', []);
tags.set('li', []);
tags.set('ul', []);
tags.set('ol', ['reversed', 'start']);
// Tags that only support certain other tags as their children
const tagsToOnlyChildren = new Map();
tagsToOnlyChildren.set('table', ['tr']);
tagsToOnlyChildren.set('tr', ['td']);
tagsToOnlyChildren.set('ol', ['li']);
tagsToOnlyChildren.set('ul', ['li']);
// Tags that should only be children of other tags
const tagsToOnlyParent = new Map();
tagsToOnlyParent.set('tr', ['table']);
tagsToOnlyParent.set('td', ['tr']);
tagsToOnlyParent.set('li', ['ol', 'ul']);
//
function isStringValueChar(char, index, input) {
    if (char === '"' && !string_utils_1.isEscaped(index, input)) {
        return false;
    }
    return true;
}
function isTextChar(char, index, input) {
    return !isTagStartChar(index, input);
}
function isTagStartChar(index, input) {
    const i = ob1_1.ob1Get0(index);
    return input[i] === '<' && !string_utils_1.isEscaped(index, input);
}
exports.isTagStartChar = isTagStartChar;
const createStringMarkupParser = parser_core_1.createParser((ParserCore) => class StringMarkupParser extends ParserCore {
    constructor(opts) {
        super(opts, 'parse/stringMarkup', { inTagHead: false });
    }
    tokenizeWithState(index, input, state) {
        const escaped = string_utils_1.isEscaped(index, input);
        const char = input[ob1_1.ob1Get0(index)];
        if (!escaped && state.inTagHead) {
            if (char === ' ') {
                return this.lookahead(ob1_1.ob1Inc(index));
            }
            if (char === '=') {
                return {
                    state,
                    token: this.finishToken('Equals'),
                };
            }
            if (char === '/') {
                return {
                    state,
                    token: this.finishToken('Slash'),
                };
            }
            if (parser_core_1.isAlpha(char)) {
                const [value, end] = this.readInputFrom(index, parser_core_1.isAlpha);
                return {
                    state,
                    token: this.finishValueToken('Word', value, end),
                };
            }
            if (char === '"') {
                const [value, stringValueEnd, unclosed] = this.readInputFrom(ob1_1.ob1Inc(index), isStringValueChar);
                if (unclosed) {
                    throw this.unexpected({
                        description: diagnostics_1.descriptions.STRING_MARKUP.UNCLOSED_STRING,
                        start: this.getPositionFromIndex(stringValueEnd),
                    });
                }
                const end = ob1_1.ob1Add(stringValueEnd, 1);
                return {
                    state,
                    token: this.finishValueToken('String', escape_1.unescapeTextValue(value), end),
                };
            }
            if (char === '>') {
                return {
                    state: {
                        inTagHead: false,
                    },
                    token: this.finishToken('Greater'),
                };
            }
        }
        if (isTagStartChar(index, input)) {
            return {
                state: {
                    inTagHead: true,
                },
                token: this.finishToken('Less'),
            };
        }
        // Keep eating text until we hit a <
        const [value, end] = this.readInputFrom(index, isTextChar);
        return {
            state,
            token: {
                type: 'Text',
                value: escape_1.unescapeTextValue(value),
                start: index,
                end,
            },
        };
    }
    atTagEnd() {
        return this.matchToken('Less') && this.lookahead().token.type === 'Slash';
    }
    parseTag(headStart, parentTagName) {
        const nameToken = this.expectToken('Word');
        const tagName = nameToken.value;
        const allowedAttributes = tags.get(tagName);
        if (allowedAttributes === undefined) {
            throw this.unexpected({
                description: diagnostics_1.descriptions.STRING_MARKUP.UNKNOWN_TAG_NAME(tagName),
                token: nameToken,
            });
        }
        // Check if this tag is restricted to certain parents
        const onlyAllowedAsChild = tagsToOnlyParent.get(tagName);
        if (onlyAllowedAsChild !== undefined) {
            if (parentTagName === undefined ||
                !onlyAllowedAsChild.includes(parentTagName)) {
                throw this.unexpected({
                    description: diagnostics_1.descriptions.STRING_MARKUP.RESTRICTED_CHILD(tagName, onlyAllowedAsChild, parentTagName),
                    token: nameToken,
                });
            }
        }
        // Check if the parent only allows certain children
        if (parentTagName !== undefined) {
            const onlyAllowedAsParent = tagsToOnlyChildren.get(parentTagName);
            if (onlyAllowedAsParent !== undefined &&
                !onlyAllowedAsParent.includes(tagName)) {
                throw this.unexpected({
                    description: diagnostics_1.descriptions.STRING_MARKUP.RESTRICTED_PARENT(parentTagName, onlyAllowedAsParent, tagName),
                    token: nameToken,
                });
            }
        }
        const attributes = {};
        const children = [];
        let selfClosing = false;
        // Parse attributes
        while (!this.matchToken('EOF') && !this.matchToken('Greater')) {
            const keyToken = this.getToken();
            let key;
            if (keyToken.type === 'Word') {
                key = keyToken.value;
                if (!allowedAttributes.includes(key) &&
                    !globalAttributes.includes(key)) {
                    throw this.unexpected({
                        description: diagnostics_1.descriptions.STRING_MARKUP.INVALID_ATTRIBUTE_NAME_FOR_TAG(tagName, key, [...allowedAttributes, ...globalAttributes]),
                    });
                }
                this.nextToken();
                // Shorthand properties
                if (this.matchToken('Word') ||
                    this.matchToken('Slash') ||
                    this.matchToken('Greater')) {
                    attributes[key] = 'true';
                    continue;
                }
                this.expectToken('Equals');
                const valueToken = this.expectToken('String');
                if (valueToken.type !== 'String') {
                    throw new Error('Expected String');
                }
                const value = valueToken.value;
                attributes[key] = value;
            }
            else if (keyToken.type === 'Slash') {
                this.nextToken();
                selfClosing = true;
            }
            else {
                throw this.unexpected({
                    description: diagnostics_1.descriptions.STRING_MARKUP.EXPECTED_ATTRIBUTE_NAME,
                });
            }
        }
        this.expectToken('Greater');
        const headEnd = this.getPosition();
        // Verify closing tag
        if (!selfClosing) {
            while (
            // Build children
            !this.matchToken('EOF') &&
                !this.atTagEnd()) {
                const child = this.parseChild(tagName);
                if (child !== undefined) {
                    children.push(child);
                }
            }
            if (this.matchToken('EOF')) {
                throw this.unexpected({
                    description: diagnostics_1.descriptions.STRING_MARKUP.UNCLOSED_TAG(tagName, this.finishLocAt(headStart, headEnd)),
                });
            }
            else {
                this.expectToken('Less');
                this.expectToken('Slash');
                const name = this.getToken();
                if (name.type === 'Word') {
                    if (name.value !== tagName) {
                        throw this.unexpected({
                            description: diagnostics_1.descriptions.STRING_MARKUP.INCORRECT_CLOSING_TAG_NAME(tagName, name.value),
                        });
                    }
                    this.nextToken();
                }
                else {
                    throw this.unexpected({
                        description: diagnostics_1.descriptions.STRING_MARKUP.EXPECTED_CLOSING_TAG_NAME,
                    });
                }
                this.expectToken('Greater');
            }
        }
        return {
            type: 'Tag',
            attributes,
            name: tagName,
            children,
        };
    }
    parseChild(parentTagName) {
        const start = this.getPosition();
        const token = this.getToken();
        this.nextToken();
        if (token.type === 'Text') {
            // If this tag has restricted children then no text is allowed
            if (parentTagName !== undefined) {
                const onlyAllowedAsParent = tagsToOnlyChildren.get(parentTagName);
                if (onlyAllowedAsParent !== undefined) {
                    // Ignore text that's just whitespace
                    if (token.value.trim() === '') {
                        return undefined;
                    }
                    else {
                        throw this.unexpected({
                            description: diagnostics_1.descriptions.STRING_MARKUP.RESTRICTED_PARENT_TEXT(parentTagName),
                            token,
                        });
                    }
                }
            }
            return {
                type: 'Text',
                value: token.value,
            };
        }
        else if (token.type === 'Less') {
            return this.parseTag(start, parentTagName);
        }
        else {
            throw this.unexpected({
                description: diagnostics_1.descriptions.STRING_MARKUP.UNKNOWN_START,
            });
        }
    }
    parse() {
        const children = [];
        while (!this.matchToken('EOF')) {
            const child = this.parseChild(undefined);
            if (child !== undefined) {
                children.push(child);
            }
        }
        return children;
    }
});
function parseMarkup(input) {
    try {
        return createStringMarkupParser({ input }).parse();
    }
    catch (err) {
        throw err;
    }
}
exports.parseMarkup = parseMarkup;
