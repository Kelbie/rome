"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Matches a whole line break (where CRLF is considered a single line break). Used to count lines.
exports.lineBreak = /\r\n?|\n|u2028|u2029/;
exports.lineBreakG = new RegExp(exports.lineBreak.source, 'g');
function isNewLine(code) {
    return code === 10 || code === 13 || code === 8232 || code === 8233;
}
exports.isNewLine = isNewLine;
exports.nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
// rome-ignore lint/emptyMatches
exports.skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
exports.NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
