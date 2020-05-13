"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const descriptions_1 = require("./descriptions");
class DiagnosticsNormalizer {
    constructor(markupOptions, sourceMaps) {
        this.sourceMaps = sourceMaps;
        this.markupOptions = markupOptions || {};
        this.hasMarkupOptions = markupOptions !== undefined;
    }
    normalizeFilename(filename) {
        const { markupOptions } = this;
        if (markupOptions === undefined || filename === undefined) {
            return filename;
        }
        const { normalizeFilename } = markupOptions;
        if (normalizeFilename === undefined) {
            return filename;
        }
        return normalizeFilename(filename);
    }
    normalizePositionValue(value) {
        if (this.markupOptions !== undefined && this.markupOptions.stripPositions) {
            return undefined;
        }
        else {
            return value;
        }
    }
    normalizeLocation(location) {
        const { sourceMaps } = this;
        if (sourceMaps === undefined) {
            return location;
        }
        let { marker, filename, start, end } = location;
        if (filename !== undefined) {
            if (start !== undefined) {
                const resolved = sourceMaps.approxOriginalPositionFor(filename, start.line, start.column);
                if (resolved !== undefined) {
                    filename = resolved.source;
                    start = {
                        ...start,
                        line: resolved.line,
                        column: resolved.column,
                    };
                }
            }
            if (end !== undefined) {
                const resolved = sourceMaps.approxOriginalPositionFor(filename, end.line, end.column);
                if (resolved !== undefined) {
                    // TODO confirm this is the same as `start` if it resolved
                    filename = resolved.source;
                    end = {
                        ...end,
                        line: resolved.line,
                        column: resolved.column,
                    };
                }
            }
        }
        return {
            ...location,
            filename: this.normalizeFilename(filename),
            marker: this.maybeNormalizeMarkup(marker),
            start: this.normalizePositionValue(start),
            end: this.normalizePositionValue(end),
        };
    }
    normalizeMarkup(markup) {
        return string_markup_1.normalizeMarkup(markup, this.markupOptions);
    }
    maybeNormalizeMarkup(markup) {
        return markup === undefined ? undefined : this.normalizeMarkup(markup);
    }
    normalizeDiagnosticAdviceItem(item) {
        const { sourceMaps } = this;
        switch (item.type) {
            case 'frame':
                return {
                    ...item,
                    location: this.normalizeLocation(item.location),
                };
            case 'list':
                return {
                    ...item,
                    list: item.list.map((markup) => this.normalizeMarkup(markup)),
                };
            case 'log':
                return {
                    ...item,
                    text: this.normalizeMarkup(item.text),
                };
            case 'action':
                if (this.markupOptions.stripPositions) {
                    return {
                        ...item,
                        // Command flags could have position information
                        commandFlags: {},
                    };
                }
                else {
                    return item;
                }
            case 'stacktrace':
                return {
                    ...item,
                    frames: item.frames.map((frame) => {
                        const { filename, line, column } = frame;
                        if (filename === undefined ||
                            line === undefined ||
                            column === undefined ||
                            (sourceMaps !== undefined && !sourceMaps.has(filename))) {
                            return {
                                ...frame,
                                start: this.normalizePositionValue(line),
                                column: this.normalizePositionValue(column),
                                filename: this.normalizeFilename(filename),
                            };
                        }
                        if (sourceMaps !== undefined) {
                            const resolved = sourceMaps.approxOriginalPositionFor(filename, line, column);
                            if (resolved !== undefined) {
                                return {
                                    ...frame,
                                    filename: this.normalizeFilename(resolved.source),
                                    line: this.normalizePositionValue(resolved.line),
                                    column: this.normalizePositionValue(resolved.column),
                                };
                            }
                        }
                        return frame;
                    }),
                };
        }
        return item;
    }
    normalizeDiagnostic(diag) {
        const { sourceMaps } = this;
        // Fast path for a common case
        if (!this.hasMarkupOptions &&
            (sourceMaps === undefined || !sourceMaps.hasAny())) {
            return diag;
        }
        const { description } = diag;
        const advice = description.advice.map((item) => {
            return this.normalizeDiagnosticAdviceItem(item);
        });
        diag = {
            ...diag,
            label: this.maybeNormalizeMarkup(diag.label),
            location: this.normalizeLocation(diag.location),
            description: {
                ...description,
                message: descriptions_1.createBlessedDiagnosticMessage(this.normalizeMarkup(description.message.value)),
                advice,
            },
        };
        return diag;
    }
}
exports.default = DiagnosticsNormalizer;
