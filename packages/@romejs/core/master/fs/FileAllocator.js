"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Locker_1 = require("../../common/utils/Locker");
const events_1 = require("@romejs/events");
class FileAllocator {
    constructor(master) {
        this.master = master;
        this.fileToWorker = new Map();
        this.locker = new Locker_1.default();
        this.evictEvent = new events_1.Event({
            name: 'evict',
        });
    }
    init() {
        this.master.memoryFs.deletedFileEvent.subscribe((path) => {
            return this.handleDeleted(path);
        });
        this.master.memoryFs.changedFileEvent.subscribe(({ path, oldStats, newStats }) => {
            return this.handleChange(path, oldStats, newStats);
        });
    }
    getAllOwnedFilenames() {
        return Array.from(this.fileToWorker.keys());
    }
    hasOwner(path) {
        return this.getOwnerId(path) !== undefined;
    }
    getOwnerId(path) {
        return this.fileToWorker.get(path.join());
    }
    verifySize(path, stats) {
        const project = this.master.projectManager.assertProjectExisting(path);
        const maxSize = project.config.files.maxSize;
        if (stats.size > maxSize) {
            throw new Error(`The file ${path.join()} exceeds the project config max size of ${maxSize} bytes`);
        }
    }
    getOwnerAssert(path) {
        const { workerManager } = this.master;
        const workerId = this.getOwnerId(path);
        if (workerId === undefined) {
            throw new Error(`No worker found for ${path}`);
        }
        const worker = workerManager.getWorkerAssert(workerId);
        if (!worker.ready) {
            throw new Error(`Worker ${workerId} isn't ready`);
        }
        return worker;
    }
    async getOrAssignOwner(path) {
        const { workerManager } = this.master;
        const workerId = this.getOwnerId(path);
        if (workerId === undefined) {
            return this.assignOwner(path);
        }
        else {
            await workerManager.locker.waitLock(workerId);
            return workerManager.getWorkerAssert(workerId);
        }
    }
    async evict(path) {
        // Find owner
        const workerId = this.getOwnerId(path);
        if (workerId === undefined) {
            return;
        }
        // Notify the worker to remove it from 'it's cache
        const filename = path.join();
        const worker = this.master.workerManager.getWorkerAssert(workerId);
        await worker.bridge.evict.call({
            filename,
        });
        this.evictEvent.send(path);
        this.master.logger.info(`[FileAllocator] Evicted %s`, filename);
    }
    async handleDeleted(path) {
        // Find owner
        const workerId = this.getOwnerId(path);
        if (workerId === undefined) {
            return;
        }
        // Evict file from 'worker cache
        await this.evict(path);
        // Disown it from 'our internal map
        this.fileToWorker.delete(path.join());
        // Remove the total size from 'this worker so it'll be assigned next
        const stats = this.master.memoryFs.getFileStatsAssert(path);
        this.master.workerManager.disown(workerId, stats);
    }
    async handleChange(path, oldStats, newStats) {
        const filename = path.join();
        const { logger, workerManager } = this.master;
        // Send update to worker owner
        if (this.hasOwner(path)) {
            // Get the worker
            const workerId = this.getOwnerId(path);
            if (workerId === undefined) {
                throw new Error(`Expected worker id for ${filename}`);
            }
            // Evict the file from 'cache
            await this.evict(path);
            // Verify that this file doesn't exceed any size limit
            this.verifySize(path, newStats);
            // Add on the new size, and remove the old
            if (oldStats === undefined) {
                throw new Error('File already has an owner so expected to have old stats but had none');
            }
            workerManager.disown(workerId, oldStats);
            workerManager.own(workerId, newStats);
        }
        else if (await this.master.projectManager.maybeEvictPossibleConfig(path)) {
            logger.info(`[FileAllocator] Evicted the project belonging to config %s`, filename);
        }
        else {
            logger.info(`[FileAllocator] No owner for eviction %s`, filename);
        }
    }
    async assignOwner(path) {
        const { workerManager, logger } = this.master;
        const filename = path.join();
        const lock = await this.locker.getLock(filename);
        // We may have waited on the lock and could already have an owner
        if (this.hasOwner(path)) {
            lock.release();
            return this.getOwnerAssert(path);
        }
        const worker = await workerManager.getNextWorker(path);
        // Add ourselves to the file map
        logger.info(`[FileAllocator] File %s assigned to worker %s`, filename, worker.id);
        this.fileToWorker.set(filename, worker.id);
        // Release and continue
        lock.release();
        return worker;
    }
}
exports.default = FileAllocator;
