"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const options_1 = require("./options");
const types_1 = require("./tokenizer/types");
exports.tokTypes = types_1.types;
const parser_1 = require("./parser");
require("./tokenizer/context");
function parseJS(userOptions) {
    const options = options_1.normalizeOptions(userOptions);
    return parser_1.createJSParser(options).parse();
}
exports.parseJS = parseJS;
function tokenizeJS(input, userOptions) {
    const options = options_1.normalizeOptions(userOptions);
    const parser = parser_1.createJSParser({ ...options, tokens: true, input });
    parser.parse();
    const diagnostics = parser.getDiagnostics();
    let tokens = parser.state.tokens;
    // If we have any diagnostics, then mark anything from the first as invalid
    if (diagnostics.length > 0) {
        const firstDiag = diagnostics[0];
        const invalidStart = firstDiag.location.start;
        const invalidEnd = firstDiag.location.end;
        if (invalidStart === undefined || invalidEnd === undefined) {
            throw new Error('All parser diagnostics are expected to have a start/end');
        }
        const invalidStartIndex = invalidStart.index;
        const invalidToken = {
            type: types_1.types.invalid,
            start: invalidStart.index,
            end: invalidEnd.index,
            loc: {
                filename: parser.filename,
                start: invalidStart,
                end: invalidEnd,
            },
        };
        // Remove all tokens after our invalid one
        tokens = tokens.filter((token) => {
            return token.loc.start.index >= invalidStartIndex;
        });
        tokens.push(invalidToken);
    }
    return tokens;
}
exports.tokenizeJS = tokenizeJS;
var types_2 = require("./tokenizer/types");
exports.keywordTokTypes = types_2.keywords;
__export(require("./xhtmlEntities"));
