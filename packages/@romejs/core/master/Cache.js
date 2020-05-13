"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const project_1 = require("@romejs/project");
const constants_1 = require("../common/constants");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
// Basic checks to determine if we can consider a and b to be mergable
function areEntriesEqual(a, b) {
    if (a.version !== b.version) {
        // Outdated cache file
        return false;
    }
    if (a.configHash !== b.configHash) {
        // Project config has been changed since this was last updated
        return false;
    }
    if (a.mtime !== b.mtime) {
        // File has been changed
        return false;
    }
    return true;
}
class Cache {
    constructor(master) {
        this.master = master;
        this.loadedEntries = new path_1.AbsoluteFilePathMap();
        this.disabled = process.env.ROME_CACHE === '0';
        this.cachePath = master.userConfig.cachePath;
    }
    async init() {
        this.master.memoryFs.deletedFileEvent.subscribe((filename) => {
            return this.master.cache.handleDeleted(filename);
        });
        const { memoryFs } = this.master;
        await fs_1.createDirectory(this.cachePath, { recursive: true });
        await memoryFs.watch(this.cachePath, project_1.DEFAULT_PROJECT_CONFIG);
    }
    async createEmptyEntry(path) {
        const { projectManager, memoryFs } = this.master;
        const project = await projectManager.assertProject(path);
        const configHashes = [...project.meta.configHashes];
        const pkg = this.master.memoryFs.getOwnedManifest(path);
        if (pkg !== undefined) {
            configHashes.push(pkg.hash);
        }
        const entry = {
            version: constants_1.VERSION,
            projectDir: project.folder.join(),
            configHash: configHashes.join(';'),
            mtime: memoryFs.getMtime(path),
            compile: {},
            analyzeDependencies: undefined,
            moduleSignature: undefined,
            lint: {},
        };
        return entry;
    }
    getCacheFilename(path) {
        const uid = this.master.projectManager.getUid(path);
        return this.cachePath.append(uid);
    }
    async handleDeleted(path) {
        // Handle the file not existing
        const cacheFilename = this.getCacheFilename(path);
        await fs_1.unlink(cacheFilename);
        this.loadedEntries.delete(path);
    }
    async get(path) {
        const emptyEntry = await this.createEmptyEntry(path);
        // If we have a loaded memory entry, make sure it's valid compared to the default entry (file changes etc)
        let loaded = this.loadedEntries.get(path);
        if (loaded !== undefined && areEntriesEqual(loaded, emptyEntry)) {
            return loaded;
        }
        if (this.disabled) {
            return emptyEntry;
        }
        const cacheFilename = this.getCacheFilename(path);
        const entry = await this.checkPossibleDiskCacheEntry(cacheFilename, emptyEntry);
        this.loadedEntries.set(path, entry);
        return entry;
    }
    async checkPossibleDiskCacheEntry(cacheFilename, emptyEntry) {
        const { memoryFs } = this.master;
        if (!memoryFs.exists(cacheFilename)) {
            return emptyEntry;
        }
        try {
            const json = await fs_1.readFileText(cacheFilename);
            const obj = JSON.parse(json);
            if (areEntriesEqual(emptyEntry, obj)) {
                return { ...emptyEntry, ...obj };
            }
            else {
                // If the entries aren't equal then there's something wrong with the cache entry
                await this.handleDeleted(cacheFilename);
                return emptyEntry;
            }
        }
        catch (err) {
            // TODO add some heuristic to only catch json and cache permission errors
            return emptyEntry;
        }
    }
    async update(path, partialEntryCallback) {
        const currEntry = await this.get(path);
        const partialEntry = typeof partialEntryCallback === 'function'
            ? partialEntryCallback(currEntry)
            : partialEntryCallback;
        const entry = {
            ...currEntry,
            ...partialEntry,
        };
        // TODO should batch these and write during idle time
        const cacheFilename = this.getCacheFilename(path);
        this.loadedEntries.set(path, entry);
        if (this.disabled) {
            return;
        }
        await fs_1.createDirectory(cacheFilename.getParent(), {
            recursive: true,
        });
        await fs_1.writeFile(cacheFilename, JSON.stringify(entry, null, '  '));
    }
}
exports.default = Cache;
