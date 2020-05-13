"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ob1_1 = require("@romejs/ob1");
const ansi_1 = require("./ansi");
const string_utils_1 = require("@romejs/string-utils");
const tagFormatters_1 = require("./tagFormatters");
function cursorToIndex(cursor) {
    return {
        line: ob1_1.ob1Get1(cursor.line) - 1,
        column: ob1_1.ob1Get1(cursor.column) - 1,
    };
}
function createTag(name, attributes, children = []) {
    return {
        type: 'Tag',
        name,
        attributes,
        children,
    };
}
class Grid {
    constructor(opts) {
        this.viewportWidth =
            opts.columns === undefined ? undefined : ob1_1.ob1Coerce1(opts.columns);
        this.markupOptions = opts;
        this.cursor = {
            line: ob1_1.ob1Number1,
            column: ob1_1.ob1Number1,
        };
        this.canLineWrap = true;
        this.width = ob1_1.ob1Number1;
        this.lines = [];
    }
    alignRight() {
        const viewportWidth = ob1_1.ob1Get(this.viewportWidth);
        if (viewportWidth === undefined) {
            return;
        }
        this.lines = this.lines.map(({ ranges, columns }) => {
            const newColumns = [...columns];
            // Pad out line to viewport width
            while (newColumns.length < viewportWidth) {
                newColumns.push(' ');
            }
            // Skip if all it contains is spaces
            let onlySpaces = true;
            for (const char of newColumns) {
                if (char !== ' ') {
                    onlySpaces = false;
                }
            }
            if (onlySpaces) {
                return {
                    columns: newColumns,
                    ranges,
                };
            }
            let offset = 0;
            // Shift whitespace from right to left
            while (newColumns[newColumns.length - 1] === ' ') {
                offset++;
                newColumns.pop();
                newColumns.unshift(' ');
            }
            const newRanges = ranges.map((range) => {
                return {
                    start: range.start + offset,
                    end: range.end + offset,
                    ancestry: range.ancestry,
                };
            });
            return {
                ranges: newRanges,
                columns: newColumns,
            };
        });
    }
    doesOverflowViewport(column) {
        return (this.canLineWrap &&
            this.viewportWidth !== undefined &&
            ob1_1.ob1Get1(column) > ob1_1.ob1Get1(this.viewportWidth));
    }
    getHeight() {
        return ob1_1.ob1Coerce1(this.lines.length);
    }
    getLineWidth(lineIndex) {
        const line = this.lines[lineIndex];
        return line === undefined ? 0 : line.columns.length;
    }
    getWidth() {
        return this.width;
    }
    getSize() {
        return {
            height: this.getHeight(),
            width: this.getWidth(),
        };
    }
    getCursor() {
        return { ...this.cursor };
    }
    getLines() {
        return this.lines.map(({ columns }) => columns.join(''));
    }
    getFormattedLines() {
        const lines = [];
        for (const { ranges, columns } of this.lines) {
            let content = columns.join('');
            // Sort ranges from last to first
            const sortedRanges = ranges.sort((a, b) => b.end - a.end);
            for (const { start, end, ancestry } of sortedRanges) {
                let substr = content.slice(start, end);
                // Format tags in reverse
                for (let i = ancestry.length - 1; i >= 0; i--) {
                    const tag = ancestry[i];
                    substr = ansiFormatText(tag, substr, this.markupOptions);
                }
                substr = ansi_1.formatAnsi.reset(substr);
                content = content.slice(0, start) + substr + content.slice(end);
            }
            lines.push(content);
        }
        return lines;
    }
    fillCursor(cursor) {
        const { line: lineIndex, column: colIndex } = cursorToIndex(cursor);
        // Pad lines
        for (let i = lineIndex; i >= 0 && this.lines[i] === undefined; i--) {
            this.lines[i] = { ranges: [], columns: [] };
        }
        // Pad columns
        const line = this.lines[lineIndex];
        for (let i = colIndex - 1; i >= 0 && line.columns[i] === undefined; i--) {
            line.columns[i] = ' ';
        }
    }
    moveCursor(cursor) {
        this.cursor = cursor;
    }
    moveCursorBottomStart() {
        this.moveCursor({
            line: ob1_1.ob1Inc(this.getHeight()),
            column: ob1_1.ob1Number1,
        });
    }
    moveCursorRight(columns = ob1_1.ob1Number1) {
        if (this.doesOverflowViewport(this.cursor.column)) {
            this.newline();
        }
        else {
            this.moveCursor({
                line: this.cursor.line,
                column: ob1_1.ob1Add(this.cursor.column, columns),
            });
        }
    }
    ensureNewline() {
        if (this.cursor.column !== ob1_1.ob1Number1) {
            this.newline();
        }
    }
    newline() {
        this.moveCursorDown();
        this.moveCursorStart();
    }
    moveCursorStart() {
        this.moveCursor({
            line: this.cursor.line,
            column: ob1_1.ob1Number1,
        });
    }
    moveCursorDown() {
        this.moveCursor({
            line: ob1_1.ob1Inc(this.cursor.line),
            column: this.cursor.column,
        });
    }
    writeToCursor(cursor, char) {
        this.fillCursor(cursor);
        const { line: lineIndex, column: colIndex } = cursorToIndex(cursor);
        this.lines[lineIndex].columns[colIndex] = char;
        if (cursor.column > this.width) {
            this.width = cursor.column;
        }
    }
    writeChar(char) {
        if (char === '\n') {
            this.newline();
            return;
        }
        this.writeToCursor(this.cursor, char);
        this.moveCursorRight();
    }
    writeText(text, ancestry) {
        if (text === '') {
            return;
        }
        const start = this.getCursor();
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLastWord = i === words.length - 1;
            // Check if printing this word would overflow the viewport
            // If the whole word itself wouldn't fit on it's own line then we will
            // perform hard line wrapping in writeChar
            const willOverflow = this.doesOverflowViewport(ob1_1.ob1Add(this.cursor.column, word.length - 1)) &&
                !this.doesOverflowViewport(ob1_1.ob1Coerce1(word.length));
            if (willOverflow) {
                this.newline();
            }
            for (const char of word) {
                this.writeChar(char);
            }
            let ignoreTrailingSpace = false;
            // Start of a sentence that was caused by line wrapping
            if (!word.endsWith('\n') &&
                this.cursor.column === ob1_1.ob1Number1 &&
                word !== '') {
                ignoreTrailingSpace = true;
            }
            // If the next word will cause an overflow then don't print a leading space as it will be pointless
            const nextWord = words[i + 1];
            if (nextWord !== undefined &&
                this.doesOverflowViewport(ob1_1.ob1Add(this.cursor.column, nextWord.length))) {
                ignoreTrailingSpace = true;
            }
            if (isLastWord) {
                ignoreTrailingSpace = true;
            }
            if (!ignoreTrailingSpace) {
                this.writeChar(' ');
            }
        }
        const end = this.getCursor();
        this.addCursorRange(start, end, ancestry);
    }
    setRange(line, start, end, ancestry) {
        if (start === end) {
            // Nothing to format. Empty tag.
            return;
        }
        if (end < start) {
            throw new Error(`end(${end}) < start(${start})`);
        }
        this.lines[line].ranges.push({
            start,
            end,
            ancestry,
        });
    }
    addCursorRange(_start, _end, ancestry) {
        if (ancestry.length === 0) {
            // No point storing a range without ancestry
            return;
        }
        const start = cursorToIndex(_start);
        const end = cursorToIndex(_end);
        if (start.line === end.line) {
            if (start.column === end.column) {
                // Empty range
                return;
            }
            this.setRange(start.line, start.column, end.column, ancestry);
        }
        else {
            // Add first line
            this.setRange(start.line, start.column, this.getLineWidth(start.line), ancestry);
            // Add middle lines
            for (let line = start.line + 1; line < end.line; line++) {
                this.setRange(line, 0, this.getLineWidth(line), ancestry);
            }
            // Add last line
            this.setRange(end.line, 0, end.column, ancestry);
        }
    }
    drawList(tag, ancestry) {
        let items = [];
        for (const child of tag.children) {
            if (child.type === 'Tag' && child.name === 'li') {
                items.push(child);
            }
        }
        if (items.length === 0) {
            return;
        }
        this.ensureNewline();
        const ordered = tag.name === 'ol';
        if (ordered) {
            const reversed = tag.attributes.reversed === 'true';
            const startOffset = Number(tag.attributes.start) || 0;
            const highestNumSize = string_utils_1.humanizeNumber(items.length + startOffset).length;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                let num = startOffset;
                if (reversed) {
                    num += items.length - i;
                }
                else {
                    num += i + 1;
                }
                const humanNum = string_utils_1.humanizeNumber(num);
                const padding = ' '.repeat(highestNumSize - humanNum.length);
                this.writeText(`${padding}${humanNum}. `, [createTag('dim', {})]);
                this.drawListItem(item, ancestry);
            }
        }
        else {
            for (const item of items) {
                this.writeText('- ', [createTag('dim', {})]);
                this.drawListItem(item, ancestry);
            }
        }
    }
    drawListItem(item, ancestry) {
        const grid = new Grid({
            ...this.markupOptions,
            columns: this.viewportWidth === undefined
                ? undefined
                : ob1_1.ob1Get1(ob1_1.ob1Sub(this.viewportWidth, this.cursor.column)),
        });
        grid.drawTag(item, ancestry);
        this.drawGrid(grid);
        this.moveCursorBottomStart();
    }
    drawTable(tag, ancestry) {
        const rows = [];
        for (const child of tag.children) {
            if (child.type === 'Tag' && child.name === 'tr') {
                const row = [];
                for (const field of child.children) {
                    if (field.type === 'Tag' && field.name === 'td') {
                        row.push(field);
                    }
                    else {
                        // Probably error?
                    }
                }
                rows.push(row);
            }
            else {
                // Probably error?
            }
        }
        // Get the max number of columns for a row
        const columnCount = Math.max(...rows.map((columns) => columns.length));
        // Get column widths
        const columnWidths = [];
        for (let i = 0; i < columnCount; i++) {
            const widths = rows.map((row) => {
                const field = row[i];
                if (field === undefined) {
                    // Could be an excessive column
                    return 0;
                }
                else {
                    const grid = new Grid({ ...this.markupOptions, columns: undefined });
                    grid.drawTag(field, ancestry);
                    return ob1_1.ob1Get1(grid.getSize().width);
                }
            });
            columnWidths[i] = Math.max(...widths);
        }
        // If the column size exceed the stream columns then scale them all down
        const colsNeeded = columnWidths.reduce((a, b) => a + b, 0);
        const { viewportWidth } = this;
        let availableCols = viewportWidth === undefined
            ? undefined
            : ob1_1.ob1Get(viewportWidth) - columnCount - 1;
        if (availableCols !== undefined && colsNeeded > availableCols) {
            // Find the biggest column
            let biggestColIndex = 0;
            for (let i = 0; i < columnWidths.length; i++) {
                const ourSize = columnWidths[i];
                const biggestSize = columnWidths[biggestColIndex];
                if (ourSize > biggestSize) {
                    biggestColIndex = i;
                }
            }
            // Remove all columns from availableCols
            for (let i = 0; i < columnWidths.length; i++) {
                if (i !== biggestColIndex) {
                    availableCols -= columnWidths[i];
                }
            }
            // Set biggest column to the availableCols
            columnWidths[biggestColIndex] = availableCols;
        }
        for (const row of rows) {
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const field = row[colIndex];
                const width = ob1_1.ob1Coerce1(columnWidths[colIndex]);
                const grid = new Grid({ ...this.markupOptions, columns: ob1_1.ob1Get1(width) });
                grid.drawTag(field, ancestry);
                if (field.attributes.align === 'right') {
                    grid.alignRight();
                }
                this.drawGrid(grid);
                this.moveCursorRight(ob1_1.ob1Inc(width));
            }
            this.moveCursorBottomStart();
        }
    }
    drawGrid(grid) {
        const { lines } = grid;
        const cursor = cursorToIndex(this.getCursor());
        // Write
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const { columns, ranges } = lines[lineIndex];
            const correctLine = cursor.line + lineIndex;
            for (let colIndex = 0; colIndex < columns.length; colIndex++) {
                const char = columns[colIndex];
                this.writeToCursor({
                    line: ob1_1.ob1Coerce1(correctLine + 1),
                    column: ob1_1.ob1Coerce1(cursor.column + colIndex + 1),
                }, char);
            }
            for (const range of ranges) {
                this.setRange(correctLine, cursor.column + range.start, cursor.column + range.end, range.ancestry);
            }
        }
    }
    drawTag(tag, ancestry) {
        const hook = hooks.get(tag.name);
        const subAncestry = [...ancestry, tag];
        const oldCanLineWrap = this.canLineWrap;
        if (tag.name === 'nobr') {
            this.canLineWrap = false;
        }
        if (hook !== undefined && hook.before !== undefined) {
            hook.before(tag, this, ancestry);
        }
        switch (tag.name) {
            case 'ol':
            case 'ul': {
                this.drawList(tag, subAncestry);
                break;
            }
            case 'table': {
                this.drawTable(tag, subAncestry);
                break;
            }
            default: {
                this.drawChildren(tag.children, subAncestry);
                break;
            }
        }
        if (hook !== undefined && hook.after !== undefined) {
            hook.after(tag, this, ancestry);
        }
        this.canLineWrap = oldCanLineWrap;
    }
    drawChildren(children, ancestry) {
        for (const child of children) {
            if (child.type === 'Text') {
                this.writeText(child.value, ancestry);
            }
            else {
                this.drawTag(child, ancestry);
            }
        }
    }
    drawRoot(children) {
        this.drawChildren(this.normalizeChildren(children), []);
    }
    normalizeChildren(children) {
        let newChildren = [];
        for (const child of children) {
            newChildren = newChildren.concat(this.normalizeChild(child));
        }
        return newChildren;
    }
    normalizeChild(child) {
        if (child.type === 'Text') {
            let { value } = child;
            // Replace '\t' with '  '
            // Remove '\r' in case it snuck in as file contents
            value = value.replace(/\t/g, '  ');
            value = value.replace(/\r/g, '');
            return [
                {
                    type: 'Text',
                    value,
                },
            ];
        }
        const tag = child;
        const children = this.normalizeChildren(tag.children);
        const textLength = getChildrenTextLength(children);
        const hasText = textLength > 0;
        const { emphasis, ...attributesWithoutEmphasis } = tag.attributes;
        if (emphasis === 'true') {
            return this.normalizeChild(createTag('emphasis', {}, [
                {
                    ...tag,
                    attributes: attributesWithoutEmphasis,
                },
            ]));
        }
        const { dim, ...attributes } = attributesWithoutEmphasis;
        if (dim === 'true') {
            return this.normalizeChild(createTag('dim', {}, [
                {
                    ...tag,
                    attributes,
                },
            ]));
        }
        // Insert padding
        if (tag.name === 'pad') {
            const width = Number(tag.attributes.width) || 0;
            const paddingSize = width - textLength;
            if (paddingSize > 0) {
                const paddingTextNode = {
                    type: 'Text',
                    value: ' '.repeat(paddingSize),
                };
                if (tag.attributes.align === 'right') {
                    return [paddingTextNode, ...tag.children];
                }
                else {
                    return [...tag.children, paddingTextNode];
                }
            }
            else {
                return tag.children;
            }
        }
        // Insert highlight legend
        if (tag.name === 'highlight') {
            const { legend, ...attributesWithoutLegend } = attributes;
            const index = Math.min(0, Number(attributes.i) || 0);
            if (legend === 'true') {
                return [
                    {
                        ...tag,
                        attributes: attributesWithoutLegend,
                    },
                    createTag('dim', {}, [
                        {
                            type: 'Text',
                            value: `[${String(index + 1)}]`,
                        },
                    ]),
                ];
            }
        }
        if (hasText) {
            // Wrap hr text in spaces
            if (tag.name === 'hr') {
                return [
                    {
                        ...tag,
                        children: [
                            {
                                type: 'Text',
                                value: ' ',
                            },
                            ...children,
                            {
                                type: 'Text',
                                value: ' ',
                            },
                        ],
                    },
                ];
            }
        }
        else {
            if (tag.name === 'filelink') {
                return [
                    {
                        ...tag,
                        children: [
                            {
                                type: 'Text',
                                value: tagFormatters_1.getFileLinkText(tagFormatters_1.getFileLinkFilename(tag.attributes, this.markupOptions), tag.attributes, this.markupOptions),
                            },
                        ],
                    },
                ];
            }
        }
        // These tags only expect text inside off them
        const singleInnerText = children.length === 1 && children[0].type === 'Text'
            ? children[0].value
            : undefined;
        if (singleInnerText !== undefined) {
            switch (tag.name) {
                case 'filesize':
                    return [
                        {
                            type: 'Text',
                            value: string_utils_1.humanizeFileSize(Number(singleInnerText)),
                        },
                    ];
                case 'duration':
                    return [
                        {
                            type: 'Text',
                            value: tagFormatters_1.formatApprox(attributes, string_utils_1.humanizeTime(Number(singleInnerText), true)),
                        },
                    ];
                case 'number':
                    return [
                        {
                            type: 'Text',
                            value: tagFormatters_1.formatNumber(attributes, singleInnerText),
                        },
                    ];
                case 'grammarNumber':
                    return [
                        {
                            type: 'Text',
                            value: tagFormatters_1.formatGrammarNumber(attributes, singleInnerText),
                        },
                    ];
            }
        }
        return [
            {
                ...tag,
                children,
            },
        ];
    }
}
exports.default = Grid;
function getChildrenTextLength(children) {
    let length = 0;
    for (const child of children) {
        if (child.type === 'Text') {
            length += child.value.length;
        }
        if (child.type === 'Tag') {
            length += getChildrenTextLength(child.children);
        }
    }
    return length;
}
const hooks = new Map();
hooks.set('hr', {
    after: (tag, grid, ancestry) => {
        const size = grid.viewportWidth === undefined
            ? 100
            : ob1_1.ob1Get1(grid.viewportWidth) - ob1_1.ob1Get1(grid.cursor.column) + 1;
        grid.writeText('\u2501'.repeat(size), ancestry);
    },
});
function ansiFormatText({ name: tagName, attributes }, value, opts) {
    switch (tagName) {
        case 'hyperlink': {
            let text = value;
            let hyperlink = attributes.target;
            if (hyperlink === undefined) {
                hyperlink = text;
            }
            if (text === '') {
                text = hyperlink;
            }
            return ansi_1.formatAnsi.hyperlink(text, hyperlink);
        }
        case 'filelink': {
            const filename = tagFormatters_1.getFileLinkFilename(attributes, opts);
            return ansi_1.formatAnsi.hyperlink(value, `file://${filename}`);
        }
        case 'inverse':
            return ansi_1.formatAnsi.inverse(` ${value} `);
        case 'emphasis':
            return ansi_1.formatAnsi.bold(value);
        case 'dim':
            return ansi_1.formatAnsi.dim(value);
        case 'italic':
            return ansi_1.formatAnsi.italic(value);
        case 'underline':
            return ansi_1.formatAnsi.underline(value);
        case 'strike':
            return ansi_1.formatAnsi.strikethrough(value);
        case 'error':
            return ansi_1.formatAnsi.red(value);
        case 'success':
            return ansi_1.formatAnsi.green(value);
        case 'warn':
            return ansi_1.formatAnsi.yellow(value);
        case 'info':
            return ansi_1.formatAnsi.blue(value);
        case 'command':
            return ansi_1.formatAnsi.italic(value);
        case 'highlight': {
            const index = Math.min(0, Number(attributes.i) || 0);
            const fn = ansiHighlightFactories[index % ansiHighlightFactories.length];
            return fn(value);
        }
        case 'color':
            return formatAnsiBackground(attributes.bg, formatAnsiForeground(attributes.fg, value));
        default:
            return value;
    }
}
// TODO fill this
const ansiHighlightFactories = [
    ansi_1.formatAnsi.magenta,
    ansi_1.formatAnsi.cyan,
];
function formatAnsiBackground(bg, text) {
    if (bg === undefined) {
        return text;
    }
    switch (bg) {
        case 'black':
            return ansi_1.formatAnsi.bgBlack(text);
        case 'brightBlack':
            return ansi_1.formatAnsi.bgBrightBlack(text);
        case 'red':
            return ansi_1.formatAnsi.bgRed(text);
        case 'brightRed':
            return ansi_1.formatAnsi.bgBrightRed(text);
        case 'green':
            return ansi_1.formatAnsi.bgGreen(text);
        case 'brightGreen':
            return ansi_1.formatAnsi.bgBrightGreen(text);
        case 'yellow':
            return ansi_1.formatAnsi.bgYellow(text);
        case 'brightYellow':
            return ansi_1.formatAnsi.bgBrightYellow(text);
        case 'blue':
            return ansi_1.formatAnsi.bgBlue(text);
        case 'brightBlue':
            return ansi_1.formatAnsi.bgBrightBlue(text);
        case 'magenta':
            return ansi_1.formatAnsi.bgMagenta(text);
        case 'brightMagenta':
            return ansi_1.formatAnsi.bgBrightMagenta(text);
        case 'cyan':
            return ansi_1.formatAnsi.bgCyan(text);
        case 'brightCyan':
            return ansi_1.formatAnsi.bgBrightCyan(text);
        case 'white':
            return ansi_1.formatAnsi.bgWhite(text);
        case 'brightWhite':
            return ansi_1.formatAnsi.bgBrightWhite(text);
        default:
            return text;
    }
}
function formatAnsiForeground(fg, text) {
    if (fg === undefined) {
        return text;
    }
    switch (fg) {
        case 'black':
            return ansi_1.formatAnsi.black(text);
        case 'brightBlack':
            return ansi_1.formatAnsi.brightBlack(text);
        case 'red':
            return ansi_1.formatAnsi.red(text);
        case 'brightRed':
            return ansi_1.formatAnsi.brightRed(text);
        case 'green':
            return ansi_1.formatAnsi.green(text);
        case 'brightGreen':
            return ansi_1.formatAnsi.brightGreen(text);
        case 'yellow':
            return ansi_1.formatAnsi.yellow(text);
        case 'brightYellow':
            return ansi_1.formatAnsi.brightYellow(text);
        case 'blue':
            return ansi_1.formatAnsi.blue(text);
        case 'brightBlue':
            return ansi_1.formatAnsi.brightBlue(text);
        case 'magenta':
            return ansi_1.formatAnsi.magenta(text);
        case 'brightMagenta':
            return ansi_1.formatAnsi.brightMagenta(text);
        case 'cyan':
            return ansi_1.formatAnsi.cyan(text);
        case 'brightCyan':
            return ansi_1.formatAnsi.brightCyan(text);
        case 'white':
            return ansi_1.formatAnsi.white(text);
        case 'brightWhite':
            return ansi_1.formatAnsi.brightWhite(text);
        default:
            return text;
    }
}
