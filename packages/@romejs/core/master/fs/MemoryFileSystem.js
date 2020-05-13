"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_js_manifest_1 = require("@romejs/codec-js-manifest");
const path_match_1 = require("@romejs/path-match");
const project_1 = require("@romejs/project");
const diagnostics_1 = require("@romejs/diagnostics");
const events_1 = require("@romejs/events");
const codec_json_1 = require("@romejs/codec-json");
const string_utils_1 = require("@romejs/string-utils");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
const fileHandlers_1 = require("../../common/fileHandlers");
const string_markup_1 = require("@romejs/string-markup");
const crypto = require("crypto");
const DEFAULT_DENYLIST = ['.hg', '.git'];
const GLOB_IGNORE = [
    path_match_1.parsePathPattern({ input: 'node_modules' }),
    path_match_1.parsePathPattern({ input: '.git' }),
    path_match_1.parsePathPattern({ input: '.hg' }),
];
function concatGlobIgnore(patterns) {
    // If there are any negate patterns then it'll never include GLOB_IGNORE
    for (const { negate } of patterns) {
        if (negate) {
            return patterns;
        }
    }
    return [...GLOB_IGNORE, ...patterns];
}
function isValidManifest(path) {
    if (path.getBasename() !== 'package.json') {
        return false;
    }
    // If a manifest is in node_modules, then make sure we're directly inside
    // a folder in node_modules.
    //
    // For unscoped package, the segments should be:
    //   -1: package.json
    //   -2: module folder
    //   -3: node_modules
    //
    // For scoped package (@scope/some-module), the segments should be:
    //   -1: package.json
    //   -2: module folder
    //   -3: scope folder
    //   -4: node_modules
    const segments = path.getSegments();
    if (segments.includes('node_modules')) {
        // Unscoped package
        if (segments[segments.length - 3] === 'node_modules') {
            return true;
        }
        // Scoped module
        if (segments[segments.length - 4] === 'node_modules' &&
            segments[segments.length - 3].startsWith('@')) {
            return true;
        }
        return false;
    }
    return true;
}
// Whenever we're performing an operation on a set of files, always do these first as they may influence how the rest are processed
const PRIORITY_FILES = new Set(project_1.ROME_CONFIG_FILENAMES);
async function createWatcher(memoryFs, diagnostics, projectFolderPath) {
    const projectFolder = projectFolderPath.join();
    const { logger } = memoryFs.master;
    // Create activity spinners for all connected reporters
    const activity = memoryFs.master.connectedReporters.progress({
        initDelay: 1000,
        title: `Adding project ${projectFolder}`,
    });
    const watchers = new path_1.AbsoluteFilePathMap();
    try {
        function onFoundDirectory(folderPath) {
            if (watchers.has(folderPath)) {
                return;
            }
            let recursive = true;
            if (process.platform === 'linux') {
                // Node on Linux doesn't support recursive directory watching so we need an fs.watch for every directory...
                recursive = false;
            }
            else if (!folderPath.equal(projectFolderPath)) {
                // If we're on any other platform then only watch the root project folder
                return;
            }
            const watcher = fs_1.watch(folderPath, { recursive, persistent: false }, (eventType, filename) => {
                if (filename === null) {
                    // TODO not sure how we want to handle this?
                    return;
                }
                const path = folderPath.resolve(filename);
                memoryFs.stat(path).then((newStats) => {
                    const diagnostics = memoryFs.master.createDisconnectedDiagnosticsProcessor([
                        {
                            category: 'memory-fs',
                            message: 'Processing fs.watch changes',
                        },
                    ]);
                    if (newStats.type === 'file') {
                        memoryFs.handleFileChange(path, newStats, {
                            diagnostics,
                            crawl: true,
                        });
                    }
                    else if (newStats.type === 'directory') {
                        memoryFs.addDirectory(path, newStats, {
                            crawl: true,
                            diagnostics,
                            onFoundDirectory,
                        });
                    }
                }).catch((err) => {
                    if (err.code === 'ENOENT') {
                        memoryFs.handleDeletion(path);
                    }
                    else {
                        throw err;
                    }
                });
            });
            watchers.set(folderPath, watcher);
        }
        // No need to call watch() on the projectFolder since it will call us
        // Perform an initial crawl
        const stats = await memoryFs.stat(projectFolderPath);
        await memoryFs.addDirectory(projectFolderPath, stats, {
            crawl: true,
            diagnostics,
            onFoundDirectory,
        });
        logger.info(`[MemoryFileSystem] Finished initial crawl for ${projectFolder} - added ${string_utils_1.humanizeNumber(memoryFs.countFiles(projectFolderPath))} files`);
    }
    finally {
        activity.end();
    }
    return () => {
        for (const watcher of watchers.values()) {
            watcher.close();
        }
    };
}
class MemoryFileSystem {
    constructor(master) {
        this.master = master;
        this.watchPromises = new Map();
        this.directoryListings = new path_1.AbsoluteFilePathMap();
        this.directories = new path_1.AbsoluteFilePathMap();
        this.files = new path_1.AbsoluteFilePathMap();
        this.manifests = new path_1.AbsoluteFilePathMap();
        this.watchers = new Map();
        this.manifestCounter = 0;
        this.changedFileEvent = new events_1.Event({
            name: 'MemoryFileSystem.changedFile',
            onError: master.onFatalErrorBound,
        });
        this.deletedFileEvent = new events_1.Event({
            name: 'MemoryFileSystem.deletedFile',
            onError: master.onFatalErrorBound,
        });
    }
    init() { }
    unwatch(dirPath) {
        const dir = dirPath.join();
        const watcher = this.watchers.get(dir);
        if (watcher === undefined) {
            return;
        }
        this.watchers.delete(dir);
        watcher.close();
        // Go through and clear all files and directories from our internal maps
        // NOTE: We deliberately do not call 'deletedFileEvent' as the code that
        // calls us will already be cleaning up
        let queue = [dirPath];
        while (queue.length > 0) {
            const path = queue.pop();
            if (path === undefined) {
                throw new Error('Unknown path');
            }
            this.directories.delete(path);
            this.manifests.delete(path);
            this.files.delete(path);
            const listing = this.directoryListings.get(path);
            if (listing !== undefined) {
                this.directoryListings.delete(path);
                queue = queue.concat(Array.from(listing.values()));
            }
        }
    }
    unwatchAll() {
        for (const { close } of this.watchers.values()) {
            close();
        }
    }
    readdir(path) {
        const listing = this.directoryListings.get(path);
        if (listing === undefined) {
            return [];
        }
        else {
            return listing.values();
        }
    }
    isDirectory(path) {
        return this.directories.has(path);
    }
    isFile(path) {
        return this.files.has(path);
    }
    getFiles() {
        return Array.from(this.files.values());
    }
    getManifestDefinition(dirname) {
        return this.manifests.get(dirname);
    }
    getManifest(dirname) {
        const def = this.getManifestDefinition(dirname);
        if (def === undefined) {
            return undefined;
        }
        else {
            return def.manifest;
        }
    }
    getOwnedManifest(path) {
        for (const dir of path.getChain()) {
            const def = this.master.memoryFs.getManifestDefinition(dir);
            if (def !== undefined) {
                return def;
            }
        }
        return undefined;
    }
    getPartialManifest(def) {
        return {
            path: def.path.join(),
            type: def.manifest.type,
        };
    }
    addFileToDirectoryListing(path) {
        const dirname = path.getParent();
        let listing = this.directoryListings.get(dirname);
        if (listing === undefined) {
            listing = new path_1.AbsoluteFilePathMap();
            this.directoryListings.set(dirname, listing);
        }
        listing.set(path, path);
    }
    handleDeletion(path) {
        // If a folder then evict all children
        const folderInfo = this.directories.get(path);
        if (folderInfo !== undefined) {
            this.directories.delete(path);
            const listing = this.directoryListings.get(path);
            if (listing !== undefined) {
                this.directoryListings.delete(path);
                for (const path of listing.values()) {
                    this.handleDeletion(path);
                }
            }
        }
        // Remove from 'all possible caches
        this.files.delete(path);
        // If this is a manifest filename then clear it from 'any possible package and our internal module map
        const basename = path.getBasename();
        if (basename === 'package.json') {
            this.handleDeletedManifest(path);
        }
        // Remove from 'parent directory listing
        const dirname = path.getParent();
        const parentListing = this.directoryListings.get(dirname);
        if (parentListing !== undefined) {
            parentListing.delete(path);
        }
        this.deletedFileEvent.send(path);
    }
    handleDeletedManifest(path) {
        const folder = path.getParent();
        const def = this.manifests.get(folder);
        if (def !== undefined) {
            this.manifests.delete(folder);
        }
    }
    async handleFileChange(path, stats, opts) {
        const oldStats = this.getFileStats(path);
        const changed = await this.addFile(path, stats, opts);
        if (changed) {
            const newStats = this.getFileStatsAssert(path);
            this.changedFileEvent.send({ path, oldStats, newStats });
        }
        return changed;
    }
    async waitIfInitializingWatch(projectFolderPath) {
        // Defer if we're initializing a parent folder
        for (const { promise, path } of this.watchPromises.values()) {
            if (projectFolderPath.isRelativeTo(path)) {
                await promise;
                return;
            }
        }
        // Wait if we're initializing descendents
        for (const { path, promise } of this.watchPromises.values()) {
            if (path.isRelativeTo(projectFolderPath)) {
                await promise;
            }
        }
    }
    async watch(projectFolderPath, projectConfig) {
        const { logger } = this.master;
        const projectFolder = projectFolderPath.join();
        const folderLink = string_markup_1.markup `<filelink target="${projectFolder}" />`;
        // Defer if we're already currently initializing this project
        const cached = this.watchPromises.get(projectFolder);
        if (cached !== undefined) {
            await cached;
            return undefined;
        }
        // Check if we're already watching this folder
        if (this.watchers.has(projectFolder)) {
            return undefined;
        }
        // Check if we're already watching a parent directory
        for (const { path } of this.watchers.values()) {
            if (projectFolderPath.isRelativeTo(path)) {
                logger.info(`[MemoryFileSystem] Skipped crawl for ${folderLink} because we're already watching the parent directory ${path.join()}`);
                return undefined;
            }
        }
        // Wait for other initializations
        await this.waitIfInitializingWatch(projectFolderPath);
        // New watch target
        logger.info(`[MemoryFileSystem] Adding new project folder ${folderLink}`);
        // Remove watchers that are descedents of this folder as this watcher will handle them
        for (const [loc, { close, path }] of this.watchers) {
            if (path.isRelativeTo(projectFolderPath)) {
                this.watchers.delete(loc);
                close();
            }
        }
        const diagnostics = this.master.createDiagnosticsProcessor({
            origins: [
                {
                    category: 'memory-fs',
                    message: 'Crawling project folder',
                },
            ],
        });
        logger.info(`[MemoryFileSystem] Watching ${folderLink}`);
        const promise = createWatcher(this, diagnostics, projectFolderPath);
        this.watchPromises.set(projectFolder, {
            path: projectFolderPath,
            promise,
        });
        const watcherClose = await promise;
        this.watchers.set(projectFolder, {
            path: projectFolderPath,
            close: watcherClose,
        });
        this.watchPromises.delete(projectFolder);
        diagnostics.maybeThrowDiagnosticsError();
    }
    async stat(path) {
        const stats = await fs_1.lstat(path);
        let type = 'unknown';
        if (stats.isDirectory()) {
            type = 'directory';
        }
        else if (stats.isFile()) {
            type = 'file';
        }
        return {
            type,
            size: stats.size,
            mtime: stats.mtimeMs,
        };
    }
    getMtime(path) {
        const stats = this.getFileStats(path);
        if (stats === undefined) {
            throw new Error(`File ${path.join()} not in database, cannot get mtime`);
        }
        else {
            return stats.mtime;
        }
    }
    getFileStats(path) {
        return this.files.get(path);
    }
    getFileStatsAssert(path) {
        const stats = this.getFileStats(path);
        if (stats === undefined) {
            throw new Error(`Expected file stats for ${path}`);
        }
        return stats;
    }
    isIgnored(path, type) {
        const project = this.master.projectManager.findProjectExisting(path);
        if (project === undefined) {
            return false;
        }
        // If we're a file and don't have an extension handler so there's no reason for us to care about it
        if (type === 'file' && fileHandlers_1.getFileHandler(path, project.config) === undefined) {
            return true;
        }
        // Ensure we aren't in any of the default denylists
        const basename = path.getBasename();
        if (DEFAULT_DENYLIST.includes(basename)) {
            return true;
        }
        return false;
    }
    isInsideProject(path) {
        return path.getSegments().includes('node_modules') === false;
    }
    // This is a wrapper around _declareManifest as it can produce diagnostics
    async declareManifest(opts) {
        const { diagnostics } = await diagnostics_1.catchDiagnostics(() => {
            return this._declareManifest(opts);
        });
        if (diagnostics !== undefined) {
            opts.diagnostics.addDiagnostics(diagnostics);
        }
    }
    async _declareManifest({ path, diagnostics, }) {
        // Fetch the manifest
        const manifestRaw = await fs_1.readFileText(path);
        const hash = crypto.createHash('sha256').update(manifestRaw).digest('hex');
        const consumer = codec_json_1.consumeJSON({
            path,
            input: manifestRaw,
            consumeDiagnosticCategory: 'parse/manifest',
        });
        const { manifest, diagnostics: normalizedDiagnostics, } = await codec_js_manifest_1.normalizeManifest(path, consumer);
        // If manifest is undefined then we failed to validate and have diagnostics
        if (normalizedDiagnostics.length > 0) {
            diagnostics.addDiagnostics(normalizedDiagnostics);
            return;
        }
        const folder = path.getParent();
        const manifestId = this.manifestCounter++;
        const def = {
            id: manifestId,
            path,
            folder,
            consumer,
            manifest,
            hash,
        };
        this.manifests.set(folder, def);
        // If we aren't in node_modules then this is a project package
        const isProjectPackage = this.isInsideProject(path);
        const { projectManager } = this.master;
        const project = projectManager.findProjectExisting(path);
        if (project !== undefined) {
            projectManager.declareManifest(project, isProjectPackage, def, diagnostics);
        }
        // Tell all workers of our discovery
        for (const worker of this.master.workerManager.getWorkers()) {
            worker.bridge.updateManifests.call({
                manifests: [{ id: def.id, manifest: this.getPartialManifest(def) }],
            });
        }
    }
    glob(cwd, opts = {}) {
        const { extensions, getProjectIgnore, test, overrideIgnore = [] } = opts;
        const paths = new path_1.AbsoluteFilePathSet();
        let crawl = [cwd];
        const ignoresByProject = new Map();
        while (crawl.length > 0) {
            const path = crawl.pop();
            const project = this.master.projectManager.assertProjectExisting(path);
            let ignore = overrideIgnore;
            // Get ignore patterns
            if (getProjectIgnore !== undefined) {
                const projectIgnore = ignoresByProject.get(project);
                if (projectIgnore === undefined) {
                    ignore = concatGlobIgnore([...ignore, ...getProjectIgnore(project)]);
                    ignoresByProject.set(project, ignore);
                }
                else {
                    ignore = projectIgnore;
                }
            }
            const ignoreMatched = path_match_1.matchPathPatterns(path, ignore, cwd);
            // Don't even recurse into explicit matches
            if (ignoreMatched === 'EXPLICIT_MATCH') {
                continue;
            }
            // Add if a matching file
            if (this.files.has(path) && ignoreMatched === 'NO_MATCH') {
                if (test !== undefined && !test(path)) {
                    continue;
                }
                // Check extensions
                if (extensions !== undefined) {
                    let matchedExt = false;
                    for (const ext of extensions) {
                        matchedExt = path.hasEndExtension(ext);
                        if (matchedExt) {
                            break;
                        }
                    }
                    if (!matchedExt) {
                        continue;
                    }
                }
                paths.add(path);
                continue;
            }
            // Crawl if we're a folder
            // NOTE: We still continue crawling on implicit matches
            const listing = this.directoryListings.get(path);
            if (listing !== undefined) {
                crawl = crawl.concat(Array.from(listing.values()));
                continue;
            }
            // TODO maybe throw? not a file or folder, doesn't exist!
        }
        return paths;
    }
    getAllFilesInFolder(folder) {
        let files = [];
        const listing = this.directoryListings.get(folder);
        if (listing !== undefined) {
            for (const file of listing.keys()) {
                if (this.files.has(file)) {
                    files.push(file);
                }
                else {
                    files = files.concat(this.getAllFilesInFolder(file));
                }
            }
        }
        return files;
    }
    countFiles(folder) {
        let count = 0;
        const listing = this.directoryListings.get(folder);
        if (listing !== undefined) {
            for (const file of listing.keys()) {
                count++;
                count += this.countFiles(file);
            }
        }
        return count;
    }
    hasStatsChanged(path, newStats) {
        const oldStats = this.directories.get(path) || this.files.get(path);
        return oldStats === undefined || newStats.mtime !== oldStats.mtime;
    }
    async addDirectory(folderPath, stats, opts) {
        if (!this.hasStatsChanged(folderPath, stats)) {
            return false;
        }
        // Check if this folder has been ignored
        if (this.isIgnored(folderPath, 'directory')) {
            return false;
        }
        if (opts.tick !== undefined) {
            opts.tick(folderPath);
        }
        this.addFileToDirectoryListing(folderPath);
        this.directories.set(folderPath, stats);
        if (opts.onFoundDirectory !== undefined) {
            opts.onFoundDirectory(folderPath);
        }
        if (opts.crawl) {
            // Crawl the folder
            const files = await fs_1.readdir(folderPath);
            // Declare the file
            const declareItem = async (path) => {
                const stats = await this.stat(path);
                if (stats.type === 'file') {
                    await this.addFile(path, stats, opts);
                }
                else if (stats.type === 'directory') {
                    await this.addDirectory(path, stats, opts);
                }
            };
            // Give priority to package.json in case we want to derive something from the project config
            for (const file of files) {
                if (PRIORITY_FILES.has(file.getBasename())) {
                    files.delete(file);
                    await declareItem(file);
                }
            }
            // Add the rest of the items
            await Promise.all(Array.from(files, declareItem));
        }
        return true;
    }
    exists(path) {
        // if we have this in our cache then the file exists
        if (this.files.has(path) || this.directories.has(path)) {
            return true;
        }
        // If we're still performing an initial crawl of any path higher in the tree then we don't know if it exists yet
        for (const { path: projectFolder } of this.watchPromises.values()) {
            if (path.isRelativeTo(projectFolder)) {
                return undefined;
            }
        }
        // if we're watching the parent folder then we'd have it in our cache if it existed
        const parent = path.getParent();
        if (this.directories.has(parent)) {
            return false;
        }
        return undefined;
    }
    async existsHard(path) {
        const resolvedExistence = this.exists(path);
        if (resolvedExistence === undefined) {
            return fs_1.exists(path);
        }
        else {
            return resolvedExistence;
        }
    }
    async addFile(path, stats, opts) {
        if (!this.hasStatsChanged(path, stats)) {
            return false;
        }
        // Check if this file has been ignored
        if (this.isIgnored(path, 'file')) {
            return false;
        }
        if (opts.tick !== undefined) {
            opts.tick(path);
        }
        this.files.set(path, stats);
        this.addFileToDirectoryListing(path);
        const basename = path.getBasename();
        const dirname = path.getParent();
        // Warn about potentially incorrect Rome config filenames
        const { projectManager } = this.master;
        projectManager.checkConfigFile(path, opts.diagnostics);
        // Add project if this is a config
        if (project_1.ROME_CONFIG_FILENAMES.includes(basename)) {
            await projectManager.queueAddProject(dirname, path);
        }
        if (isValidManifest(path)) {
            await this.declareManifest({
                diagnostics: opts.diagnostics,
                dirname,
                path,
            });
        }
        return true;
    }
}
exports.default = MemoryFileSystem;
