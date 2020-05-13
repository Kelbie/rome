"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_source_map_1 = require("@romejs/codec-source-map");
const js_compiler_1 = require("@romejs/js-compiler");
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
const fs_1 = require("@romejs/fs");
const crypto = require("crypto");
const WorkerQueue_1 = require("../WorkerQueue");
class BundleRequest {
    constructor({ bundler, reporter, mode, resolvedEntry, options, }) {
        this.options = options;
        this.reporter = reporter;
        this.bundler = bundler;
        this.cached = true;
        this.mode = mode;
        this.resolvedEntry = resolvedEntry;
        this.resolvedEntryUid = bundler.master.projectManager.getUid(resolvedEntry);
        this.diagnostics = bundler.request.createDiagnosticsProcessor({
            origins: [
                {
                    category: 'bundler',
                    message: `Requested bundle for <filelink target="${this.resolvedEntryUid}" />`,
                },
            ],
        });
        this.diagnostics.addAllowedUnusedSuppressionPrefix('lint');
        this.compiles = new Map();
        this.assets = new Map();
        this.sourceMap = new codec_source_map_1.SourceMapGenerator({
            file: resolvedEntry.getBasename(),
        });
    }
    async stepAnalyze() {
        const { graph } = this.bundler;
        const { reporter } = this;
        const analyzeProgress = reporter.progress({
            name: `bundler:analyze:${this.resolvedEntryUid}`,
            title: 'Analyzing',
        });
        this.diagnostics.setThrowAfter(100);
        try {
            await graph.seed({
                paths: [this.resolvedEntry],
                diagnosticsProcessor: this.diagnostics,
                analyzeProgress,
                validate: true,
            });
        }
        finally {
            analyzeProgress.end();
        }
        return this.bundler.graph.getNode(this.resolvedEntry).getDependencyOrder();
    }
    async stepCompile(paths) {
        const { master } = this.bundler;
        const { reporter } = this;
        this.diagnostics.setThrowAfter(undefined);
        const compilingSpinner = reporter.progress({
            name: `bundler:compile:${this.resolvedEntryUid}`,
            title: 'Compiling',
        });
        compilingSpinner.setTotal(paths.length);
        const queue = new WorkerQueue_1.default(master);
        queue.addCallback(async (path) => {
            const progressText = `<filelink target="${path.join()}" />`;
            compilingSpinner.pushText(progressText);
            await this.compileJS(path);
            compilingSpinner.tick();
            compilingSpinner.popText(progressText);
        });
        for (const path of paths) {
            await queue.pushQueue(path);
        }
        await queue.spin();
        compilingSpinner.end();
    }
    async compileJS(path) {
        const { graph } = this.bundler;
        const source = path.join();
        const mod = graph.getNode(path);
        // Build a map of relative module sources to module id
        const relativeSourcesToModuleId = {};
        for (const [relative, absolute] of mod.relativeToAbsolutePath) {
            const moduleId = graph.getNode(absolute).uid;
            relativeSourcesToModuleId[relative] = moduleId;
        }
        // Diagnostics would have already been added during the initial DependencyGraph.seed
        // We're doing the work of resolving everything again, maybe we should cache it?
        const resolvedImports = mod.resolveImports().resolved;
        let assetPath;
        if (mod.handler?.isAsset) {
            const buffer = await fs_1.readFile(mod.path);
            // Asset path in the form of: BASENAME-SHA1HASH.EXTENSIONS
            const hash = crypto.createHash('sha1').update(buffer).digest('hex');
            const basename = mod.path.getExtensionlessBasename();
            const exts = mod.path.getExtensions();
            assetPath = `${basename}-${hash}${exts}`;
            this.assets.set(assetPath, buffer);
        }
        const opts = {
            mode: this.mode,
            moduleAll: mod.all,
            moduleId: mod.uid,
            relativeSourcesToModuleId,
            resolvedImports,
            assetPath,
        };
        const lock = await this.bundler.compileLocker.getLock(source);
        const res = await this.bundler.request.requestWorkerCompile(path, 'compileForBundle', {
            bundle: opts,
        }, {});
        lock.release();
        if (!res.cached) {
            this.cached = false;
        }
        this.diagnostics.addSuppressions(res.suppressions);
        this.diagnostics.addDiagnostics(res.diagnostics);
        this.compiles.set(source, res);
        return res;
    }
    stepCombine(order, forceSourceMaps) {
        const { files } = order;
        const { inlineSourceMap } = this.bundler.config;
        const { graph } = this.bundler;
        const { resolvedEntry, mode, sourceMap } = this;
        // We allow deferring the generation of source maps. We don't do this by default as it's slower than generating them upfront
        // which is what most callers need. But for things like tests, we want to lazily compute the source map only when diagnostics
        // are present.
        let deferredSourceMaps = !forceSourceMaps && this.options.deferredSourceMaps === true;
        if (deferredSourceMaps) {
            sourceMap.addMaterializer(() => {
                this.stepCombine(order, true);
            });
        }
        let content = '';
        let lineOffset = 0;
        function push(str) {
            str += '\n';
            content += str;
            if (!deferredSourceMaps) {
                for (let cha of str) {
                    if (cha === '\n') {
                        lineOffset++;
                    }
                }
            }
        }
        function addMappings(filename, sourceContent, mappings) {
            if (deferredSourceMaps) {
                return;
            }
            sourceMap.setSourceContent(filename, sourceContent);
            for (const mapping of mappings) {
                sourceMap.addMapping({
                    ...mapping,
                    generated: {
                        ...mapping.generated,
                        line: ob1_1.ob1Add(lineOffset, mapping.generated.line),
                    },
                });
            }
        }
        const { interpreter } = this.options;
        if (interpreter !== undefined) {
            push(`#!${interpreter}\n`);
        }
        // add on bootstrap
        if (order.firstTopAwaitLocations.length > 0) {
            if (mode === 'legacy') {
                for (const { loc, mtime } of order.firstTopAwaitLocations) {
                    this.diagnostics.addDiagnostic({
                        description: diagnostics_1.descriptions.BUNDLER.TOP_LEVEL_AWAIT_IN_LEGACY,
                        location: {
                            ...loc,
                            mtime,
                        },
                    });
                }
            }
            push(`(async function(global) {`);
        }
        else {
            push(`(function(global) {`);
        }
        if (mode === 'modern') {
            push(`  'use strict';`);
        }
        // TODO prelude
        /*
        const path = createAbsoluteFilePath(loc);
        const res = await this.bundler.request.requestWorkerCompile(
          path,
          'compile',
        );
        push('(function() {');
        addMappings(
          this.bundler.master.projectManager.getUid(path),
          res.src,
          res.mappings,
        );
        push(res.code);
        push('})();');
        */
        const declaredCJS = new Set();
        function declareCJS(module) {
            if (mode !== 'modern' || module.type !== 'cjs' || declaredCJS.has(module)) {
                return;
            }
            declaredCJS.add(module);
            push(`  var ${js_compiler_1.getPrefixedBundleNamespace(module.uid)} = {};`);
        }
        // Add on files
        for (const source of files) {
            const module = graph.getNode(source);
            for (const path of module.getAbsoluteDependencies()) {
                declareCJS(graph.getNode(path));
            }
            const compileResult = this.compiles.get(source.join());
            if (compileResult === undefined) {
                continue;
                throw new Error('Expected compile result');
            }
            // Only do this in modern mode, the module id will already be in the wrapper otherwise
            if (mode === 'modern') {
                push(`  // ${module.uid}`);
            }
            declareCJS(module);
            addMappings(module.uid, compileResult.sourceText, compileResult.mappings);
            push(compileResult.compiledCode);
            push('');
        }
        // push on initial entry require
        const entryModule = graph.getNode(resolvedEntry);
        if (mode === 'modern') {
            push(`  return ${js_compiler_1.getPrefixedBundleNamespace(entryModule.uid)};`);
        }
        else {
            push(`  return Rome.requireNamespace("${entryModule.uid}");`);
        }
        // push footer
        push("})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this);");
        //
        if (inlineSourceMap === true) {
            const sourceMapComment = sourceMap.toComment();
            content += sourceMapComment;
        }
        else {
            content += `//# sourceMappingURL=${this.sourceMap.file}.map`;
        }
        return {
            diagnostics: this.diagnostics.getDiagnostics(),
            content,
            sourceMap: this.sourceMap,
            cached: this.cached,
            assets: this.assets,
        };
    }
    shouldAbort() {
        return this.diagnostics.hasDiagnostics();
    }
    abort() {
        return {
            sourceMap: this.sourceMap,
            content: '',
            diagnostics: this.diagnostics.getDiagnostics(),
            cached: false,
            assets: this.assets,
        };
    }
    async bundle() {
        const order = await this.stepAnalyze();
        if (this.shouldAbort()) {
            return this.abort();
        }
        // Compile
        await this.stepCompile(order.files);
        if (this.shouldAbort()) {
            return this.abort();
        }
        // Combine
        return await this.stepCombine(order, false);
    }
}
exports.default = BundleRequest;
