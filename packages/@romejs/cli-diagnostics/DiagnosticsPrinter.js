"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const string_markup_1 = require("@romejs/string-markup");
const utils_1 = require("./utils");
const printAdvice_1 = require("./printAdvice");
const success_json_1 = require("./banners/success.json");
const error_json_1 = require("./banners/error.json");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
function readDiagnosticsFileLocal(path) {
    if (!fs_1.existsSync(path)) {
        return;
    }
    const src = fs_1.readFileTextSync(path);
    const mtime = fs_1.lstatSync(path).mtimeMs;
    return { content: src, mtime };
}
exports.readDiagnosticsFileLocal = readDiagnosticsFileLocal;
function equalPosition(a, b) {
    if (a === undefined || b === undefined) {
        return false;
    }
    if (a.line !== b.line || a.column !== b.column) {
        return false;
    }
    return true;
}
exports.DEFAULT_PRINTER_FLAGS = {
    grep: '',
    inverseGrep: false,
    showAllDiagnostics: true,
    fieri: false,
    verboseDiagnostics: false,
    maxDiagnostics: 100,
};
class DiagnosticsPrinter extends Error {
    constructor(opts) {
        super("Diagnostics printer. If you're seeing this then it wasn't caught and printed correctly.");
        const { cwd, reporter, flags = exports.DEFAULT_PRINTER_FLAGS } = opts;
        this.reporter = reporter;
        this.flags = flags;
        this.readFile =
            opts.readFile === undefined ? readDiagnosticsFileLocal : opts.readFile;
        this.cwd = cwd === undefined ? path_1.createAbsoluteFilePath(process.cwd()) : cwd;
        this.processor =
            opts.processor === undefined ? new diagnostics_1.DiagnosticsProcessor() : opts.processor;
        this.displayedCount = 0;
        this.problemCount = 0;
        this.filteredCount = 0;
        this.truncatedCount = 0;
        this.hasTruncatedDiagnostics = false;
        this.missingFileSources = new path_1.AbsoluteFilePathSet();
        this.fileSources = new path_1.UnknownFilePathMap();
        this.fileMtimes = new path_1.UnknownFilePathMap();
        this.onFooterPrintCallbacks = [];
    }
    createFilePath(filename) {
        if (filename === undefined) {
            filename = 'unknown';
        }
        const { normalizeFilename } = this.reporter.markupOptions;
        if (normalizeFilename === undefined) {
            return path_1.createUnknownFilePath(filename);
        }
        else {
            return path_1.createUnknownFilePath(normalizeFilename(filename));
        }
    }
    throwIfAny() {
        if (this.hasDiagnostics()) {
            throw this;
        }
    }
    hasDiagnostics() {
        return this.processor.hasDiagnostics();
    }
    getDisplayedProblemsCount() {
        return this.problemCount - this.filteredCount;
    }
    shouldTruncate() {
        if (!this.flags.showAllDiagnostics &&
            this.displayedCount > this.flags.maxDiagnostics) {
            return true;
        }
        else {
            return false;
        }
    }
    getDiagnostics() {
        return this.processor.getSortedDiagnostics();
    }
    shouldIgnore(diag) {
        const { grep, inverseGrep } = this.flags;
        // An empty grep pattern means show everything
        if (grep === undefined || grep === '') {
            return false;
        }
        // Match against the supplied grep pattern
        let ignored = string_markup_1.markupToPlainTextString(diag.description.message.value).toLowerCase().includes(grep) === false;
        if (inverseGrep) {
            ignored = !ignored;
        }
        return ignored;
    }
    addFileSource(info, stats) {
        this.fileMtimes.set(info.path, stats.mtime);
        if (info.type === 'reference') {
            this.fileSources.set(info.path, {
                sourceText: stats.content,
                lines: utils_1.toLines({
                    path: info.path,
                    input: stats.content,
                    sourceType: info.sourceType,
                    language: info.language,
                }),
            });
        }
    }
    getDependenciesFromDiagnostics(diagnostics) {
        const deps = [];
        for (const { dependencies, description: { advice }, location: { language, sourceType, mtime, filename }, } of diagnostics) {
            if (filename !== undefined) {
                deps.push({
                    type: 'reference',
                    path: this.createFilePath(filename),
                    mtime,
                    language,
                    sourceType,
                });
            }
            if (dependencies !== undefined) {
                for (const { filename, mtime } of dependencies) {
                    deps.push({
                        type: 'change',
                        path: this.createFilePath(filename),
                        mtime,
                    });
                }
            }
            for (const item of advice) {
                if (item.type === 'frame') {
                    const { location } = item;
                    if (location.filename !== undefined &&
                        location.sourceText === undefined) {
                        deps.push({
                            type: 'reference',
                            path: this.createFilePath(location.filename),
                            language: location.language,
                            sourceType: location.sourceType,
                            mtime: location.mtime,
                        });
                    }
                }
            }
        }
        const depsMap = new path_1.UnknownFilePathMap();
        // Remove non-absolute filenames and normalize sourceType and language for conflicts
        for (const dep of deps) {
            const path = dep.path;
            if (!path.isAbsolute()) {
                continue;
            }
            const existing = depsMap.get(path);
            // reference dependency can override change since it has more metadata that needs conflict resolution
            if (existing === undefined || existing.type === 'change') {
                depsMap.set(dep.path, dep);
                continue;
            }
            if (dep.type === 'reference') {
                if (existing.sourceType !== dep.sourceType) {
                    existing.sourceType = 'unknown';
                }
                if (existing.language !== dep.language) {
                    existing.language = 'unknown';
                }
            }
        }
        return Array.from(depsMap.values());
    }
    fetchFileSources(diagnostics) {
        for (const dep of this.getDependenciesFromDiagnostics(diagnostics)) {
            const { path } = dep;
            if (!path.isAbsolute()) {
                continue;
            }
            const abs = path.assertAbsolute();
            const stats = this.readFile(abs);
            if (stats === undefined) {
                this.missingFileSources.add(abs);
            }
            else {
                this.addFileSource(dep, stats);
            }
        }
    }
    print() {
        const filteredDiagnostics = this.filterDiagnostics();
        this.fetchFileSources(filteredDiagnostics);
        this.displayDiagnostics(filteredDiagnostics);
    }
    displayDiagnostics(diagnostics) {
        const restoreRedirect = this.reporter.redirectOutToErr(true);
        for (const diag of diagnostics) {
            this.displayDiagnostic(diag);
        }
        this.reporter.redirectOutToErr(restoreRedirect);
    }
    getOutdatedFiles(diag) {
        let outdatedFiles = new path_1.UnknownFilePathSet();
        for (const { path, mtime: expectedMtime, } of this.getDependenciesFromDiagnostics([diag])) {
            const mtime = this.fileMtimes.get(path);
            if (mtime !== undefined &&
                expectedMtime !== undefined &&
                mtime > expectedMtime) {
                outdatedFiles.add(path);
            }
        }
        return outdatedFiles;
    }
    displayDiagnostic(diag) {
        const { reporter } = this;
        const { start, end, filename } = diag.location;
        let advice = [...diag.description.advice];
        // Remove stacktrace from beginning if it contains only one frame that matches the root diagnostic location
        const firstAdvice = advice[0];
        if (firstAdvice !== undefined &&
            firstAdvice.type === 'stacktrace' &&
            firstAdvice.frames.length === 1) {
            const frame = firstAdvice.frames[0];
            if (frame.filename === filename && equalPosition(frame, start)) {
                advice.shift();
            }
        }
        // Determine if we should skip showing the frame at the top of the diagnostic output
        // We check if there are any frame advice entries that match us exactly, this is
        // useful for stuff like reporting call stacks
        let skipFrame = false;
        if (start !== undefined && end !== undefined) {
            adviceLoop: for (const item of advice) {
                if (item.type === 'frame' &&
                    item.location.filename === filename &&
                    equalPosition(item.location.start, start) &&
                    equalPosition(item.location.end, end)) {
                    skipFrame = true;
                    break;
                }
                if (item.type === 'stacktrace') {
                    for (const frame of item.frames) {
                        if (frame.filename === filename && equalPosition(frame, start)) {
                            skipFrame = true;
                            break adviceLoop;
                        }
                    }
                }
            }
        }
        const outdatedAdvice = [];
        const outdatedFiles = this.getOutdatedFiles(diag);
        const isOutdated = outdatedFiles.size > 0;
        if (isOutdated) {
            const outdatedFilesArr = Array.from(outdatedFiles, (path) => path.join());
            if (outdatedFilesArr.length === 1 && outdatedFilesArr[0] === filename) {
                outdatedAdvice.push({
                    type: 'log',
                    category: 'warn',
                    text: 'This file has been changed since the diagnostic was produced and may be out of date',
                });
            }
            else {
                outdatedAdvice.push({
                    type: 'log',
                    category: 'warn',
                    text: 'This diagnostic may be out of date as it relies on the following files that have been changed since the diagnostic was generated',
                });
                outdatedAdvice.push({
                    type: 'list',
                    list: outdatedFilesArr.map((filename) => string_markup_1.markup `<filelink target="${filename}" />`),
                });
            }
        }
        const derived = diagnostics_1.deriveRootAdviceFromDiagnostic(diag, {
            skipFrame,
            includeHeaderInAdvice: false,
            outdated: isOutdated,
        });
        reporter.hr(derived.header);
        reporter.indent(() => {
            // Concat all the advice together
            const allAdvice = [
                ...derived.advice,
                ...outdatedAdvice,
                ...advice,
            ];
            // Print advice
            for (const item of allAdvice) {
                const res = printAdvice_1.default(item, {
                    printer: this,
                    flags: this.flags,
                    missingFileSources: this.missingFileSources,
                    fileSources: this.fileSources,
                    diagnostic: diag,
                    reporter,
                });
                if (res.printed) {
                    reporter.br();
                }
                if (res.truncated) {
                    this.hasTruncatedDiagnostics = true;
                }
            }
            // Print verbose information
            if (this.flags.verboseDiagnostics) {
                const { origins } = diag;
                if (origins !== undefined && origins.length > 0) {
                    reporter.br();
                    reporter.info('Why are you seeing this diagnostic?');
                    reporter.br();
                    reporter.list(origins.map((origin) => {
                        let res = `<emphasis>${origin.category}</emphasis>`;
                        if (origin.message !== undefined) {
                            res += `: ${origin.message}`;
                        }
                        return res;
                    }), { ordered: true });
                }
            }
        });
    }
    filterDiagnostics() {
        const diagnostics = this.getDiagnostics();
        const filteredDiagnostics = [];
        for (const diag of diagnostics) {
            this.problemCount++;
            if (this.shouldIgnore(diag)) {
                this.filteredCount++;
            }
            else if (this.shouldTruncate()) {
                this.truncatedCount++;
            }
            else {
                this.displayedCount++;
                filteredDiagnostics.push(diag);
            }
        }
        return filteredDiagnostics;
    }
    onFooterPrint(fn) {
        this.onFooterPrintCallbacks.push(fn);
    }
    footer() {
        const { reporter, problemCount } = this;
        const isError = problemCount > 0;
        if (isError) {
            const restoreRedirect = reporter.redirectOutToErr(true);
            reporter.hr();
            reporter.redirectOutToErr(restoreRedirect);
        }
        if (this.hasTruncatedDiagnostics) {
            reporter.warn('Some diagnostics have been truncated. Use the --verbose-diagnostics flag to disable truncation.');
        }
        if (isError) {
            if (this.flags.fieri) {
                this.showBanner(error_json_1.default);
            }
        }
        else {
            if (this.flags.fieri) {
                this.showBanner(success_json_1.default);
            }
        }
        for (const handler of this.onFooterPrintCallbacks) {
            const stop = handler(reporter, isError);
            if (stop) {
                return;
            }
        }
        if (isError) {
            this.footerError();
        }
        else {
            reporter.success('No known problems!');
        }
    }
    showBanner(banner) {
        for (const stream of this.reporter.getStreams(false)) {
            for (const row of banner.rows) {
                for (const field of row) {
                    let palleteIndex;
                    let times = 1;
                    if (Array.isArray(field)) {
                        [palleteIndex, times] = field;
                    }
                    else {
                        palleteIndex = field;
                    }
                    const pallete = banner.palettes[palleteIndex];
                    stream.write(string_markup_1.formatAnsi.bgRgb(' ', {
                        r: pallete[0],
                        g: pallete[1],
                        b: pallete[2],
                    }).repeat(times));
                }
                stream.write('\n');
            }
        }
    }
    footerError() {
        const { reporter, filteredCount } = this;
        const displayableProblems = this.getDisplayedProblemsCount();
        let str = `Found <number emphasis>${displayableProblems}</number> <grammarNumber plural="problems" singular="problem">${displayableProblems}</grammarNumber>`;
        if (filteredCount > 0) {
            str += `<dim> (${filteredCount} filtered)</dim>`;
        }
        reporter.error(str);
        if (this.truncatedCount > 0) {
            const { maxDiagnostics } = this.flags;
            reporter.warn(`Only <number>${maxDiagnostics}</number> errors shown, add the <emphasis>--show-all-diagnostics</emphasis> flag to view the remaining <number>${displayableProblems -
                maxDiagnostics}</number> errors`);
        }
    }
}
exports.default = DiagnosticsPrinter;
