"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
const escape_1 = require("./escape");
const Grid_1 = require("./Grid");
const ob1_1 = require("@romejs/ob1");
const tagFormatters_1 = require("./tagFormatters");
function buildTag(tag, inner, opts) {
    let { attributes } = tag;
    switch (tag.name) {
        case // Normalize filename of <filelink target>
         'filelink':
            {
                // Clone
                attributes = { ...attributes };
                const filename = tagFormatters_1.getFileLinkFilename(attributes, opts);
                const text = tagFormatters_1.getFileLinkText(filename, attributes, opts);
                attributes.target = filename;
                if (opts.stripPositions) {
                    attributes.line = undefined;
                    attributes.column = undefined;
                }
                inner = text;
                break;
            }
        // We don't technically need to normalize this but it's one less tag to have to support
        // if other tools need to consume it
        case 'grammarNumber':
            return tagFormatters_1.formatGrammarNumber(attributes, inner);
    }
    let open = `<${tag.name}`;
    // Print attributes
    for (const key in attributes) {
        const value = attributes[key];
        if (value === undefined) {
            continue;
        }
        if (value === 'true') {
            open += ` ${key}`;
        }
        else {
            const escapedValue = escape_1.escapeMarkup(value);
            open += ` ${key}="${escapedValue}"`;
        }
    }
    if (inner === '') {
        return `${open} />`;
    }
    else {
        return `${open}>${inner}</${tag.name}>`;
    }
}
function normalizeMarkupChildren(children, opts) {
    // Sometimes we'll populate the inner text of a tag with no children
    if (children.length === 0) {
        return '';
    }
    let buff = '';
    for (const child of children) {
        if (child.type === 'Text') {
            buff += escape_1.escapeMarkup(child.value);
        }
        else if (child.type === 'Tag') {
            const inner = normalizeMarkupChildren(child.children, opts);
            buff += buildTag(child, inner, opts);
        }
        else {
            throw new Error('Unknown child node type');
        }
    }
    return buff;
}
function markupToPlainTextString(input, opts = {}) {
    return markupToPlainText(input, opts).lines.join('\n');
}
exports.markupToPlainTextString = markupToPlainTextString;
function markupToPlainText(input, opts = {}) {
    const grid = new Grid_1.default(opts);
    grid.drawRoot(parse_1.parseMarkup(input));
    return {
        width: ob1_1.ob1Get1(grid.getWidth()),
        lines: grid.getLines(),
    };
}
exports.markupToPlainText = markupToPlainText;
function markupToAnsi(input, opts = {}) {
    const grid = new Grid_1.default(opts);
    grid.drawRoot(parse_1.parseMarkup(input));
    return {
        width: ob1_1.ob1Get1(grid.getWidth()),
        lines: grid.getFormattedLines(),
    };
}
exports.markupToAnsi = markupToAnsi;
function normalizeMarkup(input, opts = {}) {
    return normalizeMarkupChildren(parse_1.parseMarkup(input), opts);
}
exports.normalizeMarkup = normalizeMarkup;
