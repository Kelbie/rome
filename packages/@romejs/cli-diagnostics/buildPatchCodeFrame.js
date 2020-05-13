"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const string_diff_1 = require("@romejs/string-diff");
const string_markup_1 = require("@romejs/string-markup");
function formatDiffLine(diffs) {
    return diffs.map(([type, text]) => {
        if (type === string_diff_1.diffConstants.DELETE) {
            return string_markup_1.markupTag('error', string_markup_1.escapeMarkup(utils_1.showInvisibles(text)));
        }
        else if (type === string_diff_1.diffConstants.ADD) {
            return string_markup_1.markupTag('success', string_markup_1.escapeMarkup(utils_1.showInvisibles(text)));
        }
        else {
            // type === diffConstants.EQUAL
            return string_markup_1.escapeMarkup(text);
        }
    }).join('');
}
const DELETE_MARKER = string_markup_1.markupTag('error', '-');
const ADD_MARKER = string_markup_1.markupTag('success', '+');
function formatSingleLineMarker(text) {
    return string_markup_1.markup `<emphasis>${text}</emphasis>:`;
}
function buildPatchCodeFrame(item, verbose) {
    const diffsByLine = string_diff_1.groupDiffByLines(item.diff);
    let lastVisibleLine = -1;
    // Calculate the parts of the diff we should show
    const shownLines = new Set();
    for (let i = 0; i < diffsByLine.length; i++) {
        const diffs = diffsByLine[i];
        let hasChange = false;
        for (const [type] of diffs) {
            if (type === string_diff_1.diffConstants.DELETE || type === string_diff_1.diffConstants.ADD) {
                hasChange = true;
                break;
            }
        }
        if (hasChange) {
            for (let start = i - constants_1.CODE_FRAME_CONTEXT_LINES; start < i + constants_1.CODE_FRAME_CONTEXT_LINES; start++) {
                shownLines.add(start);
                if (start > lastVisibleLine) {
                    lastVisibleLine = start;
                }
            }
        }
    }
    const lineLength = String(lastVisibleLine).length;
    // Don't output a gutter if there's only a single line
    const singleLine = diffsByLine.length === 1;
    const { legend } = item;
    const frame = [];
    let displayedLines = 0;
    let truncated = false;
    let lastDisplayedLine = -1;
    const skippedLine = `<emphasis>${constants_1.CODE_FRAME_INDENT}${'.'.repeat(lineLength)}${constants_1.GUTTER}</emphasis>`;
    // Build the actual frame
    for (let i = 0; i < diffsByLine.length; i++) {
        if (shownLines.has(i) === false) {
            continue;
        }
        displayedLines++;
        if (!verbose && displayedLines > constants_1.MAX_PATCH_LINES) {
            truncated = true;
            continue;
        }
        const diffs = diffsByLine[i];
        const lineNo = i + 1;
        const deletions = [];
        const addition = [];
        let hasDeletions = false;
        let hasAddition = false;
        for (const tuple of diffs) {
            let [type] = tuple;
            if (type === string_diff_1.diffConstants.DELETE) {
                hasDeletions = true;
                deletions.push(tuple);
            }
            if (type === string_diff_1.diffConstants.ADD) {
                hasAddition = true;
                addition.push(tuple);
            }
            if (type === string_diff_1.diffConstants.EQUAL) {
                addition.push(tuple);
                deletions.push(tuple);
            }
        }
        if (lastDisplayedLine !== lineNo - 1 && lastDisplayedLine !== -1) {
            frame.push(skippedLine);
        }
        let gutterWithLine = '';
        let gutterNoLine = '';
        let deleteMarker = DELETE_MARKER;
        let addMarker = ADD_MARKER;
        if (!singleLine) {
            gutterWithLine = `<emphasis>${constants_1.CODE_FRAME_INDENT}<pad align="right" width="${lineLength}">${lineNo}</pad>${constants_1.GUTTER}</emphasis>`;
            gutterNoLine = `<emphasis>${constants_1.CODE_FRAME_INDENT}${' '.repeat(lineLength)}${constants_1.GUTTER}</emphasis>`;
        }
        if (singleLine && legend !== undefined) {
            addMarker = formatSingleLineMarker(legend.add);
            deleteMarker = formatSingleLineMarker(legend.delete);
        }
        if (hasDeletions) {
            const gutter = hasAddition ? gutterNoLine : gutterWithLine;
            frame.push(`${gutter}${deleteMarker} ${formatDiffLine(deletions)}`);
        }
        if (hasAddition) {
            frame.push(`${gutterWithLine}${addMarker} ${formatDiffLine(addition)}`);
        }
        if (!hasAddition && !hasDeletions) {
            // Output one of the lines, they're the same
            frame.push(`${gutterWithLine}  ${formatDiffLine(addition)}`);
        }
        lastDisplayedLine = lineNo;
    }
    if (truncated) {
        frame.push(`${skippedLine} <dim><number>${displayedLines - constants_1.MAX_PATCH_LINES}</number> more lines truncated</dim>`);
    }
    if (legend !== undefined && !singleLine) {
        frame.push('');
        frame.push(`<error>- ${string_markup_1.escapeMarkup(legend.delete)}</error>`);
        frame.push(`<success>+ ${string_markup_1.escapeMarkup(legend.add)}</success>`);
        frame.push('');
    }
    return {
        truncated,
        frame: utils_1.joinNoBreak(frame),
    };
}
exports.default = buildPatchCodeFrame;
