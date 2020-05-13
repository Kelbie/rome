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
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
const inconsiderateLanguage_json_1 = require("./inconsiderateLanguage.json");
const string_utils_1 = require("@romejs/string-utils");
// Fast regex for checking if we need to validate a string
const regex = new RegExp(inconsiderateLanguage_json_1.default.map((term) => term.word).join('|'), 'gi');
function check(loc, input) {
    let fixed = input;
    if (!regex.test(input)) {
        return {
            fixed,
            results: [],
        };
    }
    const lower = input.toLowerCase();
    const tracker = new parser_core_1.PositionTracker(lower, loc.start);
    const results = [];
    // This is a bit more complicated since we try to do the minimal amount of work
    for (let i = 0; i < lower.length; i++) {
        const char = lower[i];
        for (const { word, description, suggestion } of inconsiderateLanguage_json_1.default) {
            if (char === word[0] && lower.startsWith(word, i)) {
                const wordWithSourceCasing = input.slice(i, i + word.length);
                results.push({
                    // We want to preserve the original casing
                    word: wordWithSourceCasing,
                    description,
                    suggestion: string_utils_1.preserveCasing(wordWithSourceCasing, suggestion),
                    startIndex: i,
                    endIndex: i + word.length,
                    // Calculate the actual location of this
                    loc: {
                        ...loc,
                        start: tracker.getPositionFromIndex(ob1_1.ob1Coerce0(i)),
                        end: tracker.getPositionFromIndex(ob1_1.ob1Coerce0(i + word.length)),
                    },
                });
                i += word.length;
                break;
            }
        }
    }
    // Walk backwards through the results, autofixing with the suggestions
    // Walking backwards means we don't need to maintain offsets
    for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        fixed =
            fixed.slice(0, result.startIndex) +
                result.suggestion +
                fixed.slice(result.endIndex);
    }
    return {
        results,
        fixed,
    };
}
exports.default = {
    name: 'inconsiderateLanguage',
    enter(path) {
        const { node, context } = path;
        const { loc } = node;
        if (loc !== undefined) {
            // Infer a string to check
            let value;
            if (node.type === 'CommentBlock' || node.type === 'CommentLine') {
                value = node.value;
            }
            if (js_ast_utils_1.isIdentifierish(node)) {
                value = node.name;
            }
            if (value !== undefined) {
                // Produce diagnostics
                const { results, fixed } = check(loc, value);
                let suppressed = false;
                for (const { loc, word, description, suggestion } of results) {
                    ({ suppressed } = context.addLocDiagnostic(loc, diagnostics_1.descriptions.LINT.INCONSIDERATE_LANGUAGE(description, word, suggestion), { fixable: true }));
                    if (suppressed) {
                        break;
                    }
                }
                // Autofix if not suppressed
                if (results.length > 0 && !suppressed) {
                    if (node.type === 'CommentBlock' || node.type === 'CommentLine') {
                        return {
                            ...node,
                            value: fixed,
                        };
                    }
                    if (js_ast_utils_1.isIdentifierish(node)) {
                        return {
                            ...node,
                            name: fixed,
                        };
                    }
                }
            }
        }
        return node;
    },
};
