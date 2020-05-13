"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fileHandlers_1 = require("@romejs/core/common/fileHandlers");
const path_1 = require("@romejs/path");
const DependencyGraph_1 = require("../dependencies/DependencyGraph");
const js_compiler_1 = require("@romejs/js-compiler");
const string_markup_1 = require("@romejs/string-markup");
const WorkerQueue_1 = require("../WorkerQueue");
function createDiagnosticsPrinter(request, processor, totalCount, savedCount) {
    const printer = request.createDiagnosticsPrinter(processor);
    printer.onFooterPrint((reporter, isError) => {
        if (isError) {
            let hasPendingFixes = false;
            for (const { fixable } of processor.getDiagnostics()) {
                if (fixable) {
                    hasPendingFixes = true;
                }
            }
            if (hasPendingFixes) {
                reporter.info('Fixes available. To apply recommended fixes and formatting run');
                reporter.command('rome lint --save');
                reporter.info('To choose fix suggestions run');
                reporter.command('rome lint --review');
            }
        }
        if (savedCount > 0) {
            reporter.success(`<number emphasis>${savedCount}</number> <grammarNumber plural="files" singular="file">${savedCount}</grammarNumber> updated`);
        }
        if (!isError) {
            if (totalCount === 0) {
                reporter.warn('No files linted');
            }
            else {
                reporter.info(`<number emphasis>${totalCount}</number> <grammarNumber plural="files" singular="file">${totalCount}</grammarNumber> linted`);
            }
        }
    });
    return printer;
}
class LintRunner {
    constructor(linter, { graph, events, }) {
        this.linter = linter;
        this.master = linter.request.master;
        this.graph = graph;
        this.request = linter.request;
        this.options = linter.options;
        this.events = events;
        this.compilerDiagnosticsCache = new path_1.AbsoluteFilePathMap();
        this.hadDependencyValidationErrors = new path_1.AbsoluteFilePathMap();
    }
    async runLint({ evictedPaths, processor, }) {
        let savedCount = 0;
        const { master } = this.request;
        const { lintCompilerOptionsPerFile = {}, globalDecisions = [], hasDecisions, } = this.options;
        const shouldSave = this.linter.shouldSave();
        const shouldApplyFixes = !this.linter.shouldOnlyFormat();
        const queue = new WorkerQueue_1.default(master);
        const progress = this.events.createProgress({ title: 'Linting' });
        progress.setTotal(evictedPaths.size);
        queue.addCallback(async (path) => {
            const filename = path.join();
            const text = string_markup_1.markup `<filelink target="${filename}" />`;
            progress.pushText(text);
            let compilerOptions = lintCompilerOptionsPerFile[filename];
            // If we have decisions then make sure it's declared on all files
            if (hasDecisions) {
                if (compilerOptions === undefined) {
                    compilerOptions = {
                        hasDecisions: true,
                        globalDecisions,
                        decisionsByPosition: {},
                    };
                }
                else {
                    compilerOptions = {
                        ...compilerOptions,
                        hasDecisions: true,
                        globalDecisions: [
                            ...(compilerOptions.globalDecisions || []),
                            ...globalDecisions,
                        ],
                    };
                }
            }
            const { diagnostics, suppressions, saved, } = await this.request.requestWorkerLint(path, {
                save: shouldSave,
                applyFixes: shouldApplyFixes,
                compilerOptions,
            });
            processor.addSuppressions(suppressions);
            processor.addDiagnostics(diagnostics);
            this.compilerDiagnosticsCache.set(path, { suppressions, diagnostics });
            if (saved) {
                savedCount++;
            }
            progress.popText(text);
            progress.tick();
        });
        for (const path of evictedPaths) {
            await queue.pushQueue(path);
        }
        await queue.spin();
        progress.end();
        return { savedCount };
    }
    async runGraph({ evictedPaths, processor, firstRun, }) {
        const { graph } = this;
        // Get all the current dependency nodes for the evicted files, and invalidate their nodes
        const oldEvictedNodes = new path_1.AbsoluteFilePathMap();
        for (const path of evictedPaths) {
            const node = graph.maybeGetNode(path);
            if (node !== undefined) {
                oldEvictedNodes.set(path, node);
                graph.deleteNode(path);
            }
        }
        // Refresh only the evicted paths
        const progress = this.events.createProgress({
            title: firstRun ? 'Analyzing files' : 'Analyzing changed files',
        });
        await graph.seed({
            paths: Array.from(evictedPaths),
            diagnosticsProcessor: processor,
            validate: false,
            analyzeProgress: progress,
        });
        progress.end();
        // Maintain a list of all the dependencies we revalidated
        const validatedDependencyPaths = new path_1.AbsoluteFilePathSet();
        // Maintain a list of all the dependents that need to be revalidated
        const validatedDependencyPathDependents = new path_1.AbsoluteFilePathSet();
        // Build a list of dependents to recheck
        for (const path of evictedPaths) {
            validatedDependencyPaths.add(path);
            const newNode = graph.getNode(path);
            // Get the previous node and see if the exports have actually changed
            const oldNode = oldEvictedNodes.get(path);
            const sameShape = oldNode !== undefined &&
                js_compiler_1.areAnalyzeDependencyResultsEqual(oldNode.analyze, newNode.analyze);
            for (const depNode of newNode.getDependents()) {
                // If the old node has the same shape as the new one, only revalidate the dependent if it had dependency errors
                if (sameShape &&
                    this.hadDependencyValidationErrors.get(depNode.path) === false) {
                    continue;
                }
                validatedDependencyPaths.add(depNode.path);
                validatedDependencyPathDependents.add(depNode.path);
            }
        }
        // Revalidate dependents
        if (validatedDependencyPathDependents.size > 0) {
            const progress = this.events.createProgress({
                title: 'Analyzing dependents',
            });
            await graph.seed({
                paths: Array.from(validatedDependencyPaths),
                diagnosticsProcessor: processor,
                validate: false,
                analyzeProgress: progress,
            });
            progress.end();
        }
        // Validate connections
        for (const path of validatedDependencyPaths) {
            const hasValidationErrors = graph.validate(graph.getNode(path), processor);
            this.hadDependencyValidationErrors.set(path, hasValidationErrors);
        }
        return validatedDependencyPaths;
    }
    computeChanges({ evictedPaths, processor }, validatedDependencyPaths) {
        const { master } = this;
        const changes = [];
        const updatedPaths = new path_1.AbsoluteFilePathSet([
            ...validatedDependencyPaths,
        ]);
        const diagnosticsByFilename = processor.getDiagnosticsByFilename();
        // In case we pushed on any diagnostics that aren't from the input paths, try to resolve them
        const includedFilenamesInDiagnostics = master.projectManager.normalizeFilenamesToFilePaths(diagnosticsByFilename.keys());
        for (const path of includedFilenamesInDiagnostics.absolutes) {
            updatedPaths.add(path);
        }
        // If we validated the diagnostics of the dependents, then we need to also push their previous compiler diagnostics
        for (const path of validatedDependencyPaths) {
            if (!evictedPaths.has(path)) {
                const compilerDiagnostics = this.compilerDiagnosticsCache.get(path);
                if (compilerDiagnostics !== undefined) {
                    processor.addSuppressions(compilerDiagnostics.suppressions);
                    processor.addDiagnostics(compilerDiagnostics.diagnostics);
                }
            }
        }
        // We can't just use getDiagnosticFilenames as we need to produce empty arrays for removed diagnostics
        for (const path of updatedPaths) {
            const ref = this.request.master.projectManager.getFileReference(path);
            const diagnostics = [
                ...(diagnosticsByFilename.get(ref.uid) || []),
                ...(diagnosticsByFilename.get(ref.real.join()) || []),
            ];
            changes.push({
                filename: ref.uid,
                ref,
                diagnostics,
            });
        }
        // We can produce diagnostics that don't actually point at a file. For LSP we will just throw these away,
        // otherwise inside of Rome we can display them.
        // These filenames may be relative or undefined
        for (const filename of includedFilenamesInDiagnostics.others) {
            changes.push({
                filename,
                ref: undefined,
                diagnostics: diagnosticsByFilename.get(filename) || [],
            });
        }
        return changes;
    }
    async run(opts) {
        this.events.onRunStart();
        const { savedCount } = await this.runLint(opts);
        const validatedDependencyPaths = await this.runGraph(opts);
        const changes = await this.computeChanges(opts, validatedDependencyPaths);
        return {
            evictedPaths: opts.evictedPaths,
            changes,
            savedCount,
            totalCount: opts.evictedPaths.size,
            runner: this,
        };
    }
}
class Linter {
    constructor(req, opts) {
        this.request = req;
        this.options = opts;
    }
    shouldOnlyFormat() {
        const { formatOnly } = this.options;
        const { review } = this.request.query.requestFlags;
        return formatOnly || review;
    }
    shouldSave() {
        const { save, hasDecisions } = this.options;
        return save || hasDecisions || this.shouldOnlyFormat();
    }
    getFileArgOptions() {
        return {
            args: this.options.args,
            noun: 'lint',
            verb: 'linting',
            configCategory: 'lint',
            extensions: fileHandlers_1.LINTABLE_EXTENSIONS,
            disabledDiagnosticCategory: 'lint/disabled',
        };
    }
    createDiagnosticsProcessor(evictedPaths, runner) {
        const processor = this.request.createDiagnosticsProcessor({
            origins: [
                {
                    category: 'lint',
                    message: 'Dispatched',
                },
            ],
        });
        processor.addAllowedUnusedSuppressionPrefix('bundler');
        // Only display files that aren't absolute, are in the changed paths, or have had previous compiler diagnostics
        // This hides errors that have been lint ignored but may have been produced by dependency analysis
        processor.addFilter({
            test: (diag) => {
                const absolute = this.request.master.projectManager.getFilePathFromUidOrAbsolute(diag.location.filename);
                return (absolute === undefined ||
                    evictedPaths.has(absolute) ||
                    runner.compilerDiagnosticsCache.has(absolute));
            },
        });
        return processor;
    }
    async watch(events) {
        const graph = new DependencyGraph_1.default(this.request, this.request.getResolverOptionsFromFlags());
        const runner = new LintRunner(this, {
            events,
            graph,
        });
        let firstRun = true;
        return this.request.watchFilesFromArgs(this.getFileArgOptions(), async ({ paths: evictedPaths }, initial) => {
            const processor = this.createDiagnosticsProcessor(evictedPaths, runner);
            const result = await runner.run({ firstRun, evictedPaths, processor });
            events.onChanges(result, initial, runner);
            firstRun = false;
        });
    }
    async run(watch) {
        const { request } = this;
        const { reporter } = request;
        let printer;
        const diagnosticsByFilename = new Map();
        const watchEvent = await this.watch({
            onRunStart: () => {
                if (watch) {
                    reporter.clearScreen();
                }
            },
            createProgress: (opts) => {
                return reporter.progress(opts);
            },
            onChanges: ({ evictedPaths, changes, totalCount, savedCount, runner }) => {
                printer = createDiagnosticsPrinter(request, this.createDiagnosticsProcessor(evictedPaths, runner), totalCount, savedCount);
                // Update our diagnostics with the changes
                for (const { filename, diagnostics } of changes) {
                    if (diagnostics.length === 0) {
                        diagnosticsByFilename.delete(filename);
                    }
                    else {
                        diagnosticsByFilename.set(filename, diagnostics);
                    }
                }
                // Print all diagnostics
                for (const diagnostics of diagnosticsByFilename.values()) {
                    printer.processor.addDiagnostics(diagnostics);
                }
                if (watch) {
                    reporter.clearScreen();
                    printer.print();
                    printer.footer();
                }
            },
        });
        if (watch) {
            await request.endEvent.wait();
        }
        else {
            watchEvent.unsubscribe();
            if (printer === undefined) {
                throw new Error('Expected a printer');
            }
            throw printer;
        }
    }
}
exports.default = Linter;
