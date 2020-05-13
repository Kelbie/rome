"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_utils_1 = require("@romejs/string-utils");
const path_1 = require("@romejs/path");
function humanizeMarkupFilename(filename, opts = {}) {
    if (opts.humanizeFilename !== undefined) {
        const override = opts.humanizeFilename(filename);
        if (override !== undefined) {
            return override;
        }
    }
    return path_1.createUnknownFilePath(filename).format(opts.cwd);
}
exports.humanizeMarkupFilename = humanizeMarkupFilename;
function getFileLinkText(filename, attributes, opts) {
    let text = humanizeMarkupFilename(filename, opts);
    const line = attributes.line;
    if (line !== undefined) {
        text += `:${line}`;
        const column = attributes.column;
        // Ignore a 0 column and just target the line
        if (column !== undefined && column !== '0') {
            text += `:${column}`;
        }
    }
    return text;
}
exports.getFileLinkText = getFileLinkText;
function getFileLinkFilename(attributes, opts) {
    let filename = attributes.target || '';
    if (opts.normalizeFilename !== undefined) {
        filename = opts.normalizeFilename(filename);
    }
    return filename;
}
exports.getFileLinkFilename = getFileLinkFilename;
function formatApprox(attributes, value) {
    if (attributes.approx === 'true') {
        return `~${value}`;
    }
    else {
        return value;
    }
}
exports.formatApprox = formatApprox;
function formatGrammarNumber(attributes, value) {
    const num = Number(value);
    const none = attributes.none;
    if (none !== undefined && num === 0) {
        return none;
    }
    const singular = attributes.singular;
    if (singular !== undefined && num === 1) {
        return singular;
    }
    const plural = attributes.plural;
    if (plural !== undefined) {
        return plural;
    }
    return '';
}
exports.formatGrammarNumber = formatGrammarNumber;
function formatNumber(attributes, value) {
    const num = Number(value);
    const human = string_utils_1.humanizeNumber(num);
    const humanWithApprox = formatApprox(attributes, human);
    return humanWithApprox;
}
exports.formatNumber = formatNumber;
