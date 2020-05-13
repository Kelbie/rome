"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_utils_1 = require("@romejs/string-utils");
const string_diff_1 = require("@romejs/string-diff");
const ob1_1 = require("@romejs/ob1");
const js_parser_utils_1 = require("@romejs/js-parser-utils");
const string_markup_1 = require("@romejs/string-markup");
function buildSuggestionAdvice(value, items, { minRating = 0.5, ignoreCase, formatItem } = {}) {
    const advice = [];
    const ratings = string_utils_1.orderBySimilarity(value, items, {
        minRating,
        formatItem,
        ignoreCase,
    });
    const strings = ratings.map((item) => {
        const { target } = item;
        if (formatItem === undefined) {
            return target;
        }
        else {
            return formatItem(target);
        }
    });
    const topRatingFormatted = strings.shift();
    if (topRatingFormatted === undefined) {
        return advice;
    }
    // Raw rating that hasn't been formatted
    const topRatingRaw = ratings[0].target;
    if (topRatingRaw === value) {
        // TODO produce a better example
    }
    // If there's only 2 suggestions then just say "Did you mean A or B?" rather than printing the list
    if (strings.length === 1) {
        advice.push({
            type: 'log',
            category: 'info',
            text: string_markup_1.markup `Did you mean <emphasis>${topRatingFormatted}</emphasis> or <emphasis>${strings[0]}</emphasis>?`,
        });
    }
    else {
        advice.push({
            type: 'log',
            category: 'info',
            text: string_markup_1.markup `Did you mean <emphasis>${topRatingFormatted}</emphasis>?`,
        });
        advice.push({
            type: 'diff',
            diff: string_diff_1.default(value, topRatingRaw),
        });
        if (strings.length > 0) {
            advice.push({
                type: 'log',
                category: 'info',
                text: 'Or one of these?',
            });
            advice.push({
                type: 'list',
                list: strings.map((str) => string_markup_1.escapeMarkup(str)),
                truncate: true,
            });
        }
    }
    // TODO check if ANY of the suggestions match
    if (topRatingRaw !== value &&
        topRatingRaw.toLowerCase() === value.toLowerCase()) {
        advice.push({
            type: 'log',
            category: 'warn',
            text: 'This operation is case sensitive',
        });
    }
    return advice;
}
exports.buildSuggestionAdvice = buildSuggestionAdvice;
// Sometimes we'll have big blobs of JS in a diagnostic when we'll only show a snippet. This method pads it out then truncates the rest for efficient transmission. We will have crappy ANSI formatting in the console and elsewhere but for places where we need to truncate we probably don't care (generated code).
function truncateSourceText(code, start, end) {
    const lines = code.split(js_parser_utils_1.NEWLINE);
    // Pad the starting and ending lines by 10
    const fromLine = Math.max(ob1_1.ob1Get1(start.line) - 10, 0);
    const toLine = Math.max(ob1_1.ob1Get1(end.line) + 10, lines.length);
    const capturedLines = lines.slice(fromLine, toLine);
    return '\n'.repeat(fromLine) + capturedLines.join('\n');
}
exports.truncateSourceText = truncateSourceText;
function buildDuplicateLocationAdvice(locations) {
    const locationAdvice = locations.map((location) => {
        if (location === undefined) {
            return {
                type: 'log',
                category: 'warn',
                text: 'Unable to find location',
            };
        }
        else {
            return {
                type: 'frame',
                location,
            };
        }
    });
    return [
        {
            type: 'log',
            category: 'info',
            text: 'Defined already here',
        },
        ...locationAdvice,
    ];
}
exports.buildDuplicateLocationAdvice = buildDuplicateLocationAdvice;
function diagnosticLocationToMarkupFilelink(loc) {
    const { start, filename } = loc;
    if (filename === undefined) {
        return 'unknown';
    }
    if (start === undefined) {
        return string_markup_1.markup `<filelink target="${filename}" />`;
    }
    return string_markup_1.markup `<filelink target="${filename}" line="${start.line}" column="${start.column}" />`;
}
exports.diagnosticLocationToMarkupFilelink = diagnosticLocationToMarkupFilelink;
