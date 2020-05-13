"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const WorkerQueue_1 = require("../WorkerQueue");
const DependencyNode_1 = require("./DependencyNode");
const Locker_1 = require("../../common/utils/Locker");
const events_1 = require("@romejs/events");
const path_1 = require("@romejs/path");
const string_markup_1 = require("@romejs/string-markup");
const BUILTINS = [
    'electron',
    'buffer',
    'child_process',
    'crypto',
    'dgram',
    'dns',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'readline',
    'stream',
    'string_decoder',
    'tls',
    'tty',
    'zlib',
    'constants',
    'events',
    'url',
    'assert',
    'util',
    'path',
    'punycode',
    'querystring',
    'cluster',
    'console',
    'module',
    'process',
    'vm',
    'domain',
    'v8',
    'repl',
    'timers',
    'inspector',
];
class DependencyGraph {
    constructor(request, resolverOpts) {
        this.request = request;
        this.master = request.master;
        this.nodes = new path_1.AbsoluteFilePathMap();
        this.resolverOpts = resolverOpts;
        this.locker = new Locker_1.default();
        this.closeEvent = new events_1.Event({ name: 'DependencyGraph.closeEvent' });
    }
    close() {
        this.closeEvent.send();
    }
    isExternal(source) {
        return BUILTINS.includes(source);
    }
    getBundleBuddyStats(entries) {
        const stats = [];
        for (const node of this.nodes.values()) {
            const source = node.uid;
            for (const absoluteTarget of node.relativeToAbsolutePath.values()) {
                const target = this.getNode(absoluteTarget).uid;
                stats.push({
                    target,
                    source,
                });
            }
        }
        for (const absoluteEntry of entries) {
            const source = this.getNode(absoluteEntry).uid;
            stats.push({
                source,
                target: undefined,
            });
        }
        return stats;
    }
    deleteNode(path) {
        this.nodes.delete(path);
    }
    addNode(path, res) {
        const module = new DependencyNode_1.default(this, this.master.projectManager.getFileReference(path), res);
        this.nodes.set(path, module);
        return module;
    }
    maybeGetNode(path) {
        return this.nodes.get(path);
    }
    getNode(path) {
        const mod = this.maybeGetNode(path);
        if (mod === undefined) {
            throw new Error(`No module found for ${path.join()}`);
        }
        return mod;
    }
    async seed({ paths, diagnosticsProcessor, analyzeProgress, validate = false, }) {
        const workerQueue = new WorkerQueue_1.default(this.master);
        workerQueue.addCallback(async (path, item) => {
            await this.resolve(path, {
                workerQueue,
                all: item.all,
                async: item.async,
                ancestry: item.ancestry,
            }, diagnosticsProcessor, analyzeProgress);
        });
        // Add initial queue items
        const roots = await Promise.all(paths.map((path) => this.resolve(path, {
            workerQueue,
            all: true,
            async: false,
            ancestry: [],
        }, diagnosticsProcessor, analyzeProgress)));
        await workerQueue.spin();
        if (diagnosticsProcessor.hasDiagnostics()) {
            return;
        }
        if (validate) {
            for (const root of roots) {
                this.validateTransitive(root, diagnosticsProcessor);
            }
        }
    }
    validate(node, diagnosticsProcessor) {
        const resolvedImports = node.resolveImports();
        return (diagnosticsProcessor.addDiagnostics(resolvedImports.diagnostics).length >
            0);
    }
    validateTransitive(node, diagnosticsProcessor) {
        const order = node.getDependencyOrder();
        diagnosticsProcessor.addDiagnostics(order.diagnostics);
        for (const path of order.files) {
            this.validate(this.getNode(path), diagnosticsProcessor);
        }
    }
    async resolve(path, opts, diagnosticsProcessor, analyzeProgress) {
        const filename = path.join();
        const { async, all, ancestry } = opts;
        const { master } = this;
        // We have a lock here in case we hit `this.resolve` while we're waiting for the `analyzeDependencies` result
        const lock = await this.locker.getLock(filename);
        if (this.nodes.has(path)) {
            const node = this.getNode(path);
            if (all) {
                node.setAll(true);
            }
            if (async) {
                node.setUsedAsync(true);
            }
            lock.release();
            return node;
        }
        const progressText = string_markup_1.markup `<filelink target="${filename}" />`;
        if (analyzeProgress !== undefined) {
            analyzeProgress.pushText(progressText);
        }
        const res = await this.request.requestWorkerAnalyzeDependencies(path, {});
        const node = this.addNode(path, res);
        node.setAll(all);
        node.setUsedAsync(async);
        lock.release();
        const { dependencies, diagnostics } = res;
        if (diagnostics.length > 0) {
            diagnosticsProcessor.addDiagnostics(diagnostics);
        }
        // If we're a remote path then the origin should be the URL and not our local path
        const remote = this.master.projectManager.getRemoteFromLocalPath(path);
        const origin = remote === undefined ? path : remote.getParent();
        // Resolve full locations
        await Promise.all(dependencies.map(async (dep) => {
            const { source, optional } = dep;
            if (this.isExternal(source)) {
                return;
            }
            const { diagnostics } = await diagnostics_1.catchDiagnostics(async () => {
                const resolved = await master.resolver.resolveAssert({
                    ...this.resolverOpts,
                    origin,
                    source: path_1.createUnknownFilePath(source),
                }, dep.loc === undefined
                    ? undefined
                    : {
                        location: {
                            sourceText: undefined,
                            ...dep.loc,
                            language: 'js',
                            mtime: undefined,
                        },
                    });
                node.addDependency(source, resolved.path, dep);
            }, {
                category: 'DependencyGraph',
                message: 'Caught by resolve',
            });
            if (diagnostics !== undefined && !optional) {
                diagnosticsProcessor.addDiagnostics(diagnostics);
            }
        }));
        // Queue our dependencies...
        const subAncestry = [...ancestry, filename];
        for (const path of node.getAbsoluteDependencies()) {
            const dep = node.getDependencyInfoFromAbsolute(path).analyze;
            await opts.workerQueue.pushQueue(path, {
                all: dep.all,
                async: dep.async,
                type: dep.type,
                loc: dep.loc,
                ancestry: subAncestry,
            });
        }
        if (analyzeProgress !== undefined) {
            analyzeProgress.popText(progressText);
            analyzeProgress.tick();
        }
        return node;
    }
}
exports.default = DependencyGraph;
