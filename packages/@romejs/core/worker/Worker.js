"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../common/utils/Logger");
const js_parser_1 = require("@romejs/js-parser");
const v8_1 = require("@romejs/v8");
const WorkerAPI_1 = require("./WorkerAPI");
const cli_reporter_1 = require("@romejs/cli-reporter");
const setupGlobalErrorHandlers_1 = require("../common/utils/setupGlobalErrorHandlers");
const userConfig_1 = require("../common/userConfig");
const project_1 = require("@romejs/project");
const diagnostics_1 = require("@romejs/diagnostics");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
const files_1 = require("../common/types/files");
const fileHandlers_1 = require("../common/fileHandlers");
class Worker {
    constructor(opts) {
        this.bridge = opts.bridge;
        this.userConfig = userConfig_1.loadUserConfig();
        this.partialManifests = new Map();
        this.projects = new Map();
        this.astCache = new path_1.AbsoluteFilePathMap();
        this.moduleSignatureCache = new path_1.UnknownFilePathMap();
        this.buffers = new path_1.AbsoluteFilePathMap();
        this.logger = new Logger_1.default('worker', () => opts.bridge.log.hasSubscribers(), {
            streams: [
                {
                    type: 'all',
                    format: 'none',
                    columns: cli_reporter_1.Reporter.DEFAULT_COLUMNS,
                    unicode: true,
                    write(chunk) {
                        opts.bridge.log.send(chunk.toString());
                    },
                },
            ],
        });
        //
        this.api = new WorkerAPI_1.default(this);
        if (opts.globalErrorHandlers) {
            setupGlobalErrorHandlers_1.default((err) => {
                // TODO
                err;
            });
        }
    }
    getPartialManifest(id) {
        const manifest = this.partialManifests.get(id);
        if (manifest === undefined) {
            throw new Error(`Requested manifest ${id} but we don't have it`);
        }
        return manifest;
    }
    end() {
        // This will only actually be called when a Worker is created inside of the Master
        // Clear internal maps for memory, in case the Worker instance sticks around
        this.astCache.clear();
        this.projects.clear();
        this.moduleSignatureCache.clear();
    }
    async init() {
        const bridge = this.bridge;
        bridge.endEvent.subscribe(() => {
            this.end();
        });
        let profiler;
        bridge.profilingStart.subscribe(async (data) => {
            if (profiler !== undefined) {
                throw new Error('Expected no profiler to be running');
            }
            profiler = new v8_1.Profiler();
            await profiler.startProfiling(data.samplingInterval);
        });
        bridge.profilingStop.subscribe(async () => {
            if (profiler === undefined) {
                throw new Error('Expected a profiler to be running');
            }
            const workerProfile = await profiler.stopProfiling();
            profiler = undefined;
            return workerProfile;
        });
        bridge.compileJS.subscribe((payload) => {
            return this.api.compileJS(files_1.convertTransportFileReference(payload.file), payload.stage, payload.options, payload.parseOptions);
        });
        bridge.parseJS.subscribe((payload) => {
            return this.api.parseJS(files_1.convertTransportFileReference(payload.file), payload.options);
        });
        bridge.lint.subscribe((payload) => {
            return this.api.lint(files_1.convertTransportFileReference(payload.file), payload.options, payload.parseOptions);
        });
        bridge.format.subscribe((payload) => {
            return this.api.format(files_1.convertTransportFileReference(payload.file), payload.parseOptions);
        });
        bridge.updateInlineSnapshots.subscribe((payload) => {
            return this.api.updateInlineSnapshots(files_1.convertTransportFileReference(payload.file), payload.updates, payload.parseOptions);
        });
        bridge.analyzeDependencies.subscribe((payload) => {
            return this.api.analyzeDependencies(files_1.convertTransportFileReference(payload.file), payload.parseOptions);
        });
        bridge.evict.subscribe((payload) => {
            this.evict(path_1.createAbsoluteFilePath(payload.filename));
            return undefined;
        });
        bridge.moduleSignatureJS.subscribe((payload) => {
            return this.api.moduleSignatureJS(files_1.convertTransportFileReference(payload.file), payload.parseOptions);
        });
        bridge.updateProjects.subscribe((payload) => {
            return this.updateProjects(payload.projects);
        });
        bridge.updateManifests.subscribe((payload) => {
            return this.updateManifests(payload.manifests);
        });
        bridge.status.subscribe(() => {
            return {
                astCacheSize: this.astCache.size,
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
            };
        });
        bridge.updateBuffer.subscribe((payload) => {
            return this.updateBuffer(files_1.convertTransportFileReference(payload.file), payload.content);
        });
    }
    async updateBuffer(ref, content) {
        const path = ref.real;
        this.buffers.set(path, content);
        // Now outdated
        this.astCache.delete(path);
        this.moduleSignatureCache.delete(path);
    }
    async getTypeCheckProvider(projectId, prefetchedModuleSignatures = {}, parseOptions) {
        const libs = [];
        // TODO Figure out how to get the uids for the libraries, probably adding some additional stuff to ProjectConfig?
        /*
        const projectConfig = this.getProjectConfig(projectId);
        for (const filename of projectConfig.typeChecking.libs) {
          const {ast, err} = await this.parse(filename, uid, projectId);
          if (err) {
            throw err;
          } else {
            invariant(ast, 'expected ast');
            libs.push(ast);
          }
        }
        */
        const resolveGraph = async (key) => {
            const value = prefetchedModuleSignatures[key];
            if (value === undefined) {
                return undefined;
            }
            switch (value.type) {
                case 'RESOLVED': {
                    this.moduleSignatureCache.set(path_1.createUnknownFilePath(value.graph.filename), value.graph);
                    return value.graph;
                }
                case 'OWNED':
                    return this.api.moduleSignatureJS(files_1.convertTransportFileReference(value.file), parseOptions);
                case 'POINTER':
                    return resolveGraph(value.key);
                case 'USE_CACHED': {
                    const cached = this.moduleSignatureCache.get(path_1.createUnknownFilePath(value.filename));
                    if (cached === undefined) {
                        throw new Error(`Master told us we have the export types for ${value.filename} cached but we dont!`);
                    }
                    return cached;
                }
            }
        };
        return {
            getExportTypes: async (origin, relative) => {
                return resolveGraph(`${origin}:${relative}`);
            },
            libs,
        };
    }
    populateDiagnosticsMtime(diagnostics) {
        return diagnostics;
    }
    async readFile(path) {
        const buffer = this.buffers.get(path);
        if (buffer === undefined) {
            return await fs_1.readFileText(path);
        }
        else {
            return buffer;
        }
    }
    async parseJS(ref, options) {
        const path = path_1.createAbsoluteFilePath(ref.real);
        const { project: projectId, uid } = ref;
        const project = this.getProject(projectId);
        // Fetch and validate extension handler
        const { handler } = fileHandlers_1.getFileHandlerAssert(ref.real, project.config);
        if (handler.toJavaScript === undefined) {
            throw new Error(`We don't know how to convert the file ${path} to js`);
        }
        // Get syntax
        let syntax = [];
        if (options.syntax !== undefined) {
            syntax = options.syntax;
        }
        else if (handler.syntax !== undefined) {
            syntax = handler.syntax;
        }
        // Get source type
        let sourceType;
        if (options.sourceType !== undefined) {
            sourceType = options.sourceType;
        }
        else if (handler.sourceType !== undefined) {
            sourceType = handler.sourceType;
        }
        else {
            sourceType = 'script';
            if (ref.manifest !== undefined) {
                const manifest = this.getPartialManifest(ref.manifest);
                if (manifest.type === 'module') {
                    sourceType = 'module';
                }
            }
        }
        if (project.config.bundler.mode === 'legacy') {
            sourceType = 'module';
        }
        const cacheEnabled = options.cache !== false;
        if (cacheEnabled) {
            // Update the lastAccessed of the ast cache and return it, it will be evicted on
            // any file change
            const cachedResult = this.astCache.get(path);
            if (cachedResult !== undefined) {
                let useCached = true;
                if (cachedResult.ast.sourceType !== sourceType) {
                    useCached = false;
                }
                if (useCached) {
                    this.astCache.set(path, {
                        ...cachedResult,
                        lastAccessed: Date.now(),
                    });
                    return cachedResult;
                }
            }
        }
        this.logger.info(`Parsing:`, path);
        const stat = await fs_1.lstat(path);
        const { sourceText, generated } = await handler.toJavaScript({
            file: ref,
            worker: this,
            project,
            parseOptions: options,
        });
        let manifestPath;
        if (ref.manifest !== undefined) {
            manifestPath = this.getPartialManifest(ref.manifest).path;
        }
        const ast = js_parser_1.parseJS({
            input: sourceText,
            mtime: stat.mtimeMs,
            manifestPath,
            path: path_1.createUnknownFilePath(uid),
            sourceType,
            syntax,
            allowReturnOutsideFunction: sourceType === 'script',
        });
        // If the AST is corrupt then we don't under any circumstance allow it
        if (ast.corrupt) {
            throw new diagnostics_1.DiagnosticsError('Corrupt AST', ast.diagnostics);
        }
        // Sometimes we may want to allow the "fixed" AST
        const allowDiagnostics = options.allowParserDiagnostics === true;
        if (!allowDiagnostics && ast.diagnostics.length > 0) {
            throw new diagnostics_1.DiagnosticsError("AST diagnostics aren't allowed", ast.diagnostics);
        }
        const res = {
            ast,
            lastAccessed: Date.now(),
            sourceText,
            project,
            path,
            generated,
        };
        if (cacheEnabled) {
            this.astCache.set(path, res);
        }
        return res;
    }
    getProject(id) {
        const config = this.projects.get(id);
        if (config === undefined) {
            throw new Error(`Unknown project ${id}, known projects are ${this.projects.keys()}`);
        }
        return config;
    }
    async writeFile(path, content) {
        // Write the file out
        await fs_1.writeFile(path, content);
        // We just wrote the file but the server watcher hasn't had time to notify us
        this.evict(path);
    }
    evict(path) {
        this.astCache.delete(path);
        this.moduleSignatureCache.delete(path);
    }
    updateManifests(manifests) {
        for (const { id, manifest } of manifests) {
            if (manifest === undefined) {
                this.partialManifests.delete(id);
            }
            else {
                this.partialManifests.set(id, manifest);
            }
        }
    }
    updateProjects(projects) {
        for (const { config, folder, id } of projects) {
            if (config === undefined) {
                this.projects.delete(id);
            }
            else {
                this.projects.set(id, {
                    folder: path_1.createAbsoluteFilePath(folder),
                    config: project_1.hydrateJSONProjectConfig(config),
                });
            }
        }
    }
}
exports.default = Worker;
