"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// A tagged template literal helper that will escape all interpolated strings, ensuring only markup works
function markup(strs, ...values) {
    let out = '';
    for (let i = 0; i < strs.length; i++) {
        const str = strs[i];
        out += str;
        const interpolated = values[i];
        if (interpolated instanceof SafeMarkup) {
            out += interpolated.value;
            continue;
        }
        if (interpolated !== undefined) {
            out += escapeMarkup(String(interpolated));
        }
    }
    return out;
}
exports.markup = markup;
class SafeMarkup {
    constructor(value) {
        this.value = value;
    }
}
function safeMarkup(input) {
    return new SafeMarkup(input);
}
exports.safeMarkup = safeMarkup;
// Escape all \ and >
function escapeMarkup(input) {
    let escaped = '';
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === '<') {
            escaped += '\\<';
        }
        else if (char === '\\') {
            escaped += '\\\\';
        }
        else {
            escaped += char;
        }
    }
    return escaped;
}
exports.escapeMarkup = escapeMarkup;
function markupTag(tagName, text, attrs) {
    let ret = `<${tagName}`;
    if (attrs !== undefined) {
        for (const key in attrs) {
            const value = attrs[key];
            if (value !== undefined) {
                ret += markup ` ${key}="${String(value)}"`;
            }
        }
    }
    ret += `>${text}</${tagName}>`;
    return ret;
}
exports.markupTag = markupTag;
function unescapeTextValue(str) {
    let unescaped = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        // Unescape \\< to just <
        // Unescape \\\\ to just \\
        if (char === '\\') {
            const nextChar = str[i + 1];
            if (nextChar === '<' || nextChar === '\\') {
                i++;
                unescaped += nextChar;
                continue;
            }
        }
        unescaped += char;
    }
    return unescaped;
}
exports.unescapeTextValue = unescapeTextValue;
