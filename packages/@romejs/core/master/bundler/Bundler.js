"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const DependencyGraph_1 = require("../dependencies/DependencyGraph");
const BundleRequest_1 = require("./BundleRequest");
const path_1 = require("@romejs/path");
const codec_js_manifest_1 = require("@romejs/codec-js-manifest");
const fs_1 = require("@romejs/fs");
const path_match_1 = require("@romejs/path-match");
const string_markup_1 = require("@romejs/string-markup");
const Locker_1 = require("@romejs/core/common/utils/Locker");
class Bundler {
    constructor(req, config) {
        this.config = config;
        this.master = req.master;
        this.reporter = req.reporter;
        this.request = req;
        this.entries = [];
        this.compileLocker = new Locker_1.default();
        this.graph = new DependencyGraph_1.default(req, config.resolver);
    }
    static createFromMasterRequest(req) {
        return new Bundler(req, req.getBundlerConfigFromFlags());
    }
    async getResolvedEntry(unresolvedEntry) {
        const { cwd } = this.config;
        const res = await this.master.resolver.resolveEntryAssert({
            ...this.config.resolver,
            origin: cwd,
            source: path_1.createUnknownFilePath(unresolvedEntry),
        });
        const { master } = this;
        const resolvedEntry = res.path;
        // Now do the same resolver request but with a package
        const manifestRootResolved = master.resolver.resolveLocal({
            ...this.config.resolver,
            origin: cwd,
            requestedType: 'package',
            source: path_1.createUnknownFilePath(unresolvedEntry),
        });
        const manifestRoot = manifestRootResolved.type === 'FOUND'
            ? manifestRootResolved.path
            : undefined;
        let manifestDef;
        if (manifestRoot !== undefined) {
            const def = master.memoryFs.getManifestDefinition(manifestRoot);
            if (def !== undefined) {
                manifestDef = def;
            }
        }
        return { manifestDef, resolvedEntry };
    }
    createBundleRequest(resolvedEntry, options, reporter) {
        const project = this.master.projectManager.assertProjectExisting(resolvedEntry);
        const mode = project.config.bundler.mode;
        this.entries.push(resolvedEntry);
        return new BundleRequest_1.default({
            bundler: this,
            mode,
            resolvedEntry,
            options,
            reporter,
        });
    }
    async compile(path) {
        const bundleRequest = this.createBundleRequest(path, {}, this.reporter);
        await bundleRequest.stepAnalyze();
        bundleRequest.diagnostics.maybeThrowDiagnosticsError();
        return await bundleRequest.compileJS(path);
    }
    // This will take multiple entry points and do some magic to make them more efficient to build in parallel
    async bundleMultiple(entries, options = {}) {
        // Clone so we can mess with it
        entries = [...entries];
        // Seed the dependency graph with all the entries at the same time
        const processor = this.request.createDiagnosticsProcessor({
            origins: [
                {
                    category: 'Bundler',
                    message: 'Analyzing dependencies for bundleMultiple',
                },
            ],
        });
        const entryUids = entries.map((entry) => this.master.projectManager.getUid(entry));
        const analyzeProgress = this.reporter.progress({
            name: `bundler:analyze:${entryUids.join(',')}`,
            title: 'Analyzing',
        });
        processor.setThrowAfter(100);
        await this.graph.seed({
            paths: entries,
            diagnosticsProcessor: processor,
            analyzeProgress,
            validate: false,
        });
        analyzeProgress.end();
        processor.maybeThrowDiagnosticsError();
        // Now actually bundle them
        const map = new Map();
        const progress = this.reporter.progress({ title: 'Bundling' });
        progress.setTotal(entries.length);
        const silentReporter = this.reporter.fork({
            streams: [],
        });
        const promises = new Set();
        // Could maybe do some of this in parallel?
        while (entries.length > 0) {
            const entry = entries.shift();
            const promise = (async () => {
                const text = string_markup_1.markup `<filelink target="${entry.join()}" />`;
                progress.pushText(text);
                map.set(entry, await this.bundle(entry, options, silentReporter));
                progress.popText(text);
                progress.tick();
            })();
            promise.then(() => {
                promises.delete(promise);
            });
            promises.add(promise);
            if (promises.size > 5) {
                await Promise.race(Array.from(promises));
            }
        }
        await Promise.all(Array.from(promises));
        progress.end();
        return map;
    }
    async bundleManifest({ resolvedEntry, manifestDef }) {
        let bundles = [];
        const files = new Map();
        const createBundle = async (resolvedSegment, options) => {
            const bundle = await this.bundle(resolvedSegment, options);
            for (const [path, content] of bundle.files) {
                files.set(path, content);
            }
            bundles = bundles.concat(bundle.bundles);
            return bundle.entry;
        };
        const entryBundle = await createBundle(resolvedEntry, {});
        //
        const bundleBuddyStats = this.graph.getBundleBuddyStats(this.entries);
        files.set('bundlebuddy.json', {
            kind: 'stats',
            content: () => JSON.stringify(bundleBuddyStats, null, '  '),
        });
        // TODO ensure that __dirname is relative to the project root
        if (manifestDef !== undefined) {
            const newManifest = await this.deriveManifest(manifestDef, entryBundle, createBundle, (relative, buffer) => {
                if (!files.has(relative)) {
                    files.set(relative, {
                        kind: 'file',
                        content: () => buffer,
                    });
                }
            });
            // If we have a `files` array then set it to all the newly added files
            // This will have included files already there that we copied
            if (newManifest.files !== undefined) {
                newManifest.files = Array.from(files.keys());
            }
            // Add a package.json with updated values
            files.set('package.json', {
                kind: 'manifest',
                content: () => JSON.stringify(newManifest, undefined, '  '),
            });
        }
        return {
            files,
            bundles,
            entry: entryBundle,
        };
    }
    async deriveManifest(manifestDef, entryBundle, createBundle, addFile) {
        // TODO figure out some way to use bundleMultiple here
        const manifest = manifestDef.manifest;
        const newManifest = {
            ...codec_js_manifest_1.convertManifestToJSON(manifest),
            main: entryBundle.js.path,
        };
        // TODO inherit some manifest properties from project configs
        const project = this.master.projectManager.findProjectExisting(manifestDef.folder);
        if (project !== undefined) {
            if (newManifest.name === undefined) {
                newManifest.name = project.config.name;
            }
        }
        // TODO remove dependencies fields, probably?
        // TODO Compile a index.d.ts
        // Copy manifest.files
        if (manifest.files !== undefined) {
            const paths = await this.master.memoryFs.glob(manifestDef.folder, {
                overrideIgnore: path_match_1.flipPathPatterns(manifest.files),
            });
            for (const path of paths) {
                const relative = manifestDef.folder.relative(path).join();
                const buffer = await fs_1.readFile(path);
                addFile(relative, buffer);
            }
        }
        // Compile manifest.bin files
        const bin = manifest.bin;
        if (bin !== undefined) {
            const newBin = {};
            newManifest.bin = newBin;
            const binConsumer = manifestDef.consumer.get('bin');
            const isBinShorthand = typeof binConsumer.asUnknown() === 'string';
            for (const [binName, relative] of manifest.bin) {
                const location = (isBinShorthand
                    ? binConsumer
                    : binConsumer.get(binName)).getDiagnosticLocation('inner-value');
                const absolute = await this.master.resolver.resolveAssert({
                    ...this.config.resolver,
                    origin: manifestDef.folder,
                    source: path_1.createUnknownFilePath(relative).toExplicitRelative(),
                }, {
                    location,
                });
                const res = await createBundle(absolute.path, {
                    prefix: `bin/${binName}`,
                    interpreter: '/usr/bin/env node',
                });
                newBin[binName] = res.js.path;
            }
        }
        // TODO `{type: "module"}` will always fail since we've produced CJS bundles
        // rome-ignore lint/noDelete
        delete newManifest.type;
        return newManifest;
    }
    async bundle(resolvedEntry, options = {}, reporter = this.reporter) {
        reporter.info(string_markup_1.markup `Bundling <filelink emphasis target="${resolvedEntry.join()}" />`);
        const req = this.createBundleRequest(resolvedEntry, options, reporter);
        const res = await req.bundle();
        const processor = this.request.createDiagnosticsProcessor();
        processor.addDiagnostics(res.diagnostics);
        processor.maybeThrowDiagnosticsError();
        if (res.cached) {
            reporter.warn('Bundle was built completely from cache');
        }
        const prefix = options.prefix === undefined ? '' : `${options.prefix}/`;
        const jsPath = `${prefix}index.js`;
        const mapPath = `${jsPath}.map`;
        const files = new Map();
        files.set(jsPath, {
            kind: 'entry',
            content: () => res.content,
        });
        files.set(mapPath, {
            kind: 'sourcemap',
            content: () => res.sourceMap.toJSON(),
        });
        for (const [relative, buffer] of res.assets) {
            files.set(relative, {
                kind: 'asset',
                content: () => buffer,
            });
        }
        const bundle = {
            js: {
                path: jsPath,
                content: res.content,
            },
            sourceMap: {
                path: mapPath,
                map: res.sourceMap,
            },
        };
        return {
            entry: bundle,
            bundles: [bundle],
            files,
        };
    }
}
exports.default = Bundler;
