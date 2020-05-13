"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const derive_1 = require("./derive");
const string_utils_1 = require("@romejs/string-utils");
const errors_1 = require("./errors");
const ob1_1 = require("@romejs/ob1");
const descriptions_1 = require("./descriptions");
const js_compiler_1 = require("@romejs/js-compiler");
const codec_source_map_1 = require("@romejs/codec-source-map");
const DiagnosticsNormalizer_1 = require("./DiagnosticsNormalizer");
const DEFAULT_UNIQUE = [
    ['category', 'filename', 'message', 'start.line', 'start.column'],
];
class DiagnosticsProcessor {
    constructor(options = {}) {
        this.filters = [];
        this.options = options;
        this.includedKeys = new Set();
        this.unique = options.unique === undefined ? DEFAULT_UNIQUE : options.unique;
        this.throwAfter = undefined;
        this.locked = false;
        this.origins = options.origins === undefined ? [] : [...options.origins];
        this.allowedUnusedSuppressionPrefixes = new Set();
        this.usedSuppressions = new Set();
        this.suppressions = new Set();
        this.sourceMaps = new codec_source_map_1.SourceMapConsumerCollection();
        this.normalizer = new DiagnosticsNormalizer_1.default(options.markupOptions, this.sourceMaps);
        this.diagnostics = [];
        this.cachedDiagnostics = undefined;
    }
    static createImmediateThrower(origins) {
        const diagnostics = new DiagnosticsProcessor({
            origins,
            onDiagnostics() {
                diagnostics.maybeThrowDiagnosticsError();
            },
        });
        return diagnostics;
    }
    lock() {
        this.locked = true;
    }
    unshiftOrigin(origin) {
        this.origins.unshift(origin);
    }
    setThrowAfter(num) {
        this.throwAfter = num;
    }
    maybeThrowDiagnosticsError() {
        if (this.hasDiagnostics()) {
            throw new errors_1.DiagnosticsError('Thrown by DiagnosticsProcessor', this.getDiagnostics());
        }
    }
    hasDiagnostics() {
        return this.getDiagnostics().length > 0;
    }
    assertEmpty() {
        if (this.hasDiagnostics()) {
            throw new Error('Expected no diagnostics for this operation');
        }
    }
    addAllowedUnusedSuppressionPrefix(prefix) {
        this.assertEmpty();
        this.allowedUnusedSuppressionPrefixes.add(prefix);
    }
    addSuppressions(suppressions) {
        this.cachedDiagnostics = undefined;
        for (const suppression of suppressions) {
            this.suppressions.add(suppression);
        }
    }
    addFilters(filters) {
        this.cachedDiagnostics = undefined;
        this.filters = this.filters.concat(filters);
    }
    addFilter(filter) {
        this.cachedDiagnostics = undefined;
        this.filters.push(filter);
    }
    doesMatchFilter(diag) {
        for (const suppression of this.suppressions) {
            if (js_compiler_1.matchesSuppression(diag.location, suppression)) {
                this.usedSuppressions.add(suppression);
                return true;
            }
        }
        for (const filter of this.filters) {
            if (filter.message !== undefined &&
                filter.message !== diag.description.message.value) {
                continue;
            }
            if (filter.filename !== undefined &&
                filter.filename !== diag.location.filename) {
                continue;
            }
            if (filter.category !== undefined &&
                filter.category !== diag.description.category) {
                continue;
            }
            if (filter.start !== undefined && diag.location.start !== undefined) {
                if (filter.start.line !== diag.location.start.line ||
                    filter.start.column !== diag.location.start.column) {
                    continue;
                }
            }
            if (filter.line !== undefined &&
                diag.location.start !== undefined &&
                diag.location.start.line !== filter.line) {
                continue;
            }
            if (filter.test !== undefined && filter.test(diag)) {
                continue;
            }
            return true;
        }
        return false;
    }
    buildDedupeKeys(diag) {
        if (diag.unique) {
            return [];
        }
        // We don't do anything with `end` in this method, it's fairly meaningless for deduping errors
        let { start } = diag.location;
        const keys = [];
        for (const rule of this.unique) {
            const parts = [];
            if (rule.includes('category')) {
                parts.push(`category:${diag.description.category}`);
            }
            if (rule.includes('filename')) {
                parts.push(`filename:${String(diag.location.filename)}`);
            }
            if (rule.includes('message')) {
                parts.push(`message:${diag.description.message}`);
            }
            if (start !== undefined) {
                if (rule.includes('start.line')) {
                    parts.push(`start.line:${start.line}`);
                }
                if (rule.includes('start.column')) {
                    parts.push(`start.column:${start.column}`);
                }
            }
            const key = parts.join(',');
            keys.push(key);
        }
        return keys;
    }
    addDiagnosticAssert(diag, origin) {
        return this.addDiagnostics([diag], origin, true)[0];
    }
    addDiagnostic(diag, origin) {
        return this.addDiagnostics([diag], origin)[0];
    }
    addDiagnostics(diags, origin, force) {
        if (diags.length === 0) {
            return diags;
        }
        this.cachedDiagnostics = undefined;
        if (this.locked) {
            throw new Error('DiagnosticsProcessor is locked and cannot accept anymore diagnostics');
        }
        const { max } = this.options;
        const added = [];
        // Add origins to diagnostics
        const origins = [...this.origins];
        if (origin !== undefined) {
            origins.push(origin);
        }
        diags = derive_1.addOriginsToDiagnostics(origins, diags);
        // Filter diagnostics
        diagLoop: for (let diag of diags) {
            if (!force && max !== undefined && this.diagnostics.length > max) {
                break;
            }
            // Check before normalization
            if (!force && this.doesMatchFilter(diag)) {
                continue;
            }
            diag = this.normalizer.normalizeDiagnostic(diag);
            // Check after normalization
            if (!force && this.doesMatchFilter(diag)) {
                continue;
            }
            const keys = this.buildDedupeKeys(diag);
            if (!force) {
                for (const key of keys) {
                    if (this.includedKeys.has(key)) {
                        continue diagLoop;
                    }
                }
            }
            this.diagnostics.push(diag);
            added.push(diag);
            for (const key of keys) {
                this.includedKeys.add(key);
            }
        }
        const { onDiagnostics } = this.options;
        if (onDiagnostics !== undefined && added.length > 0) {
            onDiagnostics(added);
        }
        const { throwAfter } = this;
        if (throwAfter !== undefined && this.diagnostics.length >= throwAfter) {
            this.maybeThrowDiagnosticsError();
        }
        return added;
    }
    getDiagnosticsByFilename() {
        const byFilename = new Map();
        for (const diag of this.getDiagnostics()) {
            const { filename } = diag.location;
            let filenameDiagnostics = byFilename.get(filename);
            if (filenameDiagnostics === undefined) {
                filenameDiagnostics = [];
                byFilename.set(filename, filenameDiagnostics);
            }
            filenameDiagnostics.push(diag);
        }
        return byFilename;
    }
    getDiagnostics() {
        const { cachedDiagnostics } = this;
        if (cachedDiagnostics !== undefined) {
            return cachedDiagnostics;
        }
        const diagnostics = [...this.diagnostics];
        // Add errors for remaining suppressions
        for (const suppression of this.suppressions) {
            if (this.usedSuppressions.has(suppression)) {
                continue;
            }
            const [categoryPrefix] = suppression.category.split('/');
            if (this.allowedUnusedSuppressionPrefixes.has(categoryPrefix)) {
                continue;
            }
            diagnostics.push({
                location: suppression.commentLocation,
                description: descriptions_1.descriptions.SUPPRESSIONS.UNUSED(suppression),
            });
        }
        this.cachedDiagnostics = diagnostics;
        return diagnostics;
    }
    getSortedDiagnostics() {
        const diagnosticsByFilename = this.getDiagnosticsByFilename();
        // Get all filenames and sort them
        const filenames = Array.from(diagnosticsByFilename.keys()).sort((a, b) => {
            if (a === undefined || b === undefined) {
                return 0;
            }
            else {
                return string_utils_1.naturalCompare(a, b);
            }
        });
        let sortedDiagnostics = [];
        for (const filename of filenames) {
            const fileDiagnostics = diagnosticsByFilename.get(filename);
            if (fileDiagnostics === undefined) {
                throw new Error('We use keys() so should be present');
            }
            // Sort all file diagnostics by location start index
            const sortedFileDiagnostics = fileDiagnostics.sort((a, b) => {
                const aStart = a.location.start;
                const bStart = b.location.start;
                if (aStart === undefined || bStart === undefined) {
                    return 0;
                }
                else {
                    return ob1_1.ob1Get0(aStart.index) - ob1_1.ob1Get0(bStart.index);
                }
            });
            sortedDiagnostics = [...sortedDiagnostics, ...sortedFileDiagnostics];
        }
        return sortedDiagnostics;
    }
}
exports.default = DiagnosticsProcessor;
