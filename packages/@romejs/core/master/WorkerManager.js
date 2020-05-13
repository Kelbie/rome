"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fork_1 = require("../common/utils/fork");
const constants_1 = require("../common/constants");
const core_1 = require("@romejs/core");
const Locker_1 = require("../common/utils/Locker");
const events_1 = require("@romejs/events");
class WorkerManager {
    constructor(master) {
        this.master = master;
        this.workerStartEvent = new events_1.Event({
            name: 'WorkerManager.workerStart',
            onError: master.onFatalErrorBound,
        });
        this.selfWorker = true;
        this.locker = new Locker_1.default();
        this.workers = new Map();
        this.idCounter = 0;
    }
    getNextWorkerId() {
        return this.idCounter++;
    }
    getWorkerAssert(id) {
        const worker = this.workers.get(id);
        if (worker === undefined) {
            throw new Error('Expected worker');
        }
        return worker;
    }
    getWorkers() {
        return Array.from(this.workers.values());
    }
    // Get worker count, excluding ghost workers
    getWorkerCount() {
        let count = 0;
        for (const worker of this.workers.values()) {
            if (worker.ghost === false) {
                count++;
            }
        }
        return count;
    }
    // Get all the workers that live in external processes
    getExternalWorkers() {
        return this.getWorkers().filter((worker) => worker.process !== undefined);
    }
    end() {
        // Shutdown all workers, no need to clean up any internal data structures since they will never be used
        for (const { bridge } of this.workers.values()) {
            bridge.end();
        }
    }
    getLowestByteCountWorker() {
        // Find the worker with the lowest byteCount value
        let smallestWorker;
        let byteCount;
        for (const worker of this.workers.values()) {
            if (!worker.ghost &&
                (byteCount === undefined || byteCount > worker.byteCount)) {
                smallestWorker = worker;
                byteCount = worker.byteCount;
            }
        }
        if (smallestWorker === undefined) {
            // This shouldn't be possible
            throw new Error('No worker found');
        }
        else {
            return smallestWorker;
        }
    }
    async init() {
        // Create the worker
        const bridge = events_1.createBridgeFromLocal(core_1.WorkerBridge, {});
        const worker = new core_1.Worker({
            bridge,
            globalErrorHandlers: false,
        });
        // We make an assumption elsewhere in the code that this is always the first worker
        // Let's use an invariant here for completeness
        const id = this.getNextWorkerId();
        if (id !== 0) {
            throw new Error('Expected master worker id to be 0');
        }
        const container = {
            id: 0,
            fileCount: 0,
            byteCount: 0,
            process: undefined,
            bridge,
            ghost: false,
            ready: false,
        };
        this.workers.set(0, container);
        await worker.init();
        await Promise.all([this.workerHandshake(container), bridge.handshake()]);
        this.workerStartEvent.send(bridge);
    }
    async replaceOwnWorker() {
        const lock = this.locker.getNewLock(0);
        try {
            const masterWorker = this.getWorkerAssert(0);
            this.master.logger.info(`[WorkerManager] Spawning first worker outside of master after exceeding ${constants_1.MAX_MASTER_BYTES_BEFORE_WORKERS} bytes`);
            this.selfWorker = false;
            // Spawn a new worker
            const newWorker = await this.spawnWorker(this.getNextWorkerId(), true);
            // End the old worker, will automatically cleanup
            masterWorker.bridge.end();
            // Swap the workers
            // We perform this as a single atomic operation rather than doing it in spawnWorker so we have predictable worker retrieval
            this.workers.set(0, {
                id: 0,
                fileCount: masterWorker.fileCount,
                byteCount: masterWorker.byteCount,
                bridge: newWorker.bridge,
                process: newWorker.process,
                ghost: false,
                ready: true,
            });
            this.workers.delete(newWorker.id);
        }
        finally {
            lock.release();
        }
    }
    onNewProject(newProject) {
        this.master.projectManager.notifyWorkersOfProjects(this.getWorkers(), [newProject]);
    }
    async workerHandshake(worker) {
        const { bridge } = worker;
        await bridge.handshake({ timeout: 3000 });
        await this.master.projectManager.notifyWorkersOfProjects([worker]);
        worker.ready = true;
    }
    async spawnWorker(workerId, isGhost = false) {
        const lock = this.locker.getNewLock(workerId);
        try {
            return await this._spawnWorker(workerId, isGhost);
        }
        finally {
            lock.release();
        }
    }
    async _spawnWorker(workerId, isGhost) {
        const start = Date.now();
        const process = fork_1.default('worker');
        const bridge = events_1.createBridgeFromChildProcess(core_1.WorkerBridge, process, {
            type: 'client',
            onSendMessage: (data) => {
                this.master.logger.info(`[WorkerManager] Sending worker request to %s:`, workerId, data);
            },
        });
        const worker = {
            id: workerId,
            fileCount: 0,
            byteCount: 0,
            process,
            bridge,
            ghost: isGhost,
            ready: false,
        };
        this.workers.set(workerId, worker);
        process.once('error', (err) => {
            // The process could not be spawned, or
            // The process could not be killed, or
            // Sending a message to the child process failed.
            this.master.onFatalError(err);
            process.kill();
        });
        process.once('exit', () => {
            //bridge.end(`Worker ${String(workerId)} died`);
            this.master.onFatalError(new Error(`Worker ${String(workerId)} died`));
        });
        await this.workerHandshake(worker);
        // If a worker is spawned while we're profiling then make sure it's profiling too
        if (this.master.profiling !== undefined) {
            await bridge.profilingStart.call(this.master.profiling);
        }
        this.workerStartEvent.send(bridge);
        this.master.logger.info(`[WorkerManager] Worker %s started after %sms`, workerId, Date.now() - start);
        return worker;
    }
    own(workerId, stats) {
        const worker = this.getWorkerAssert(workerId);
        worker.byteCount += stats.size;
        worker.fileCount++;
    }
    disown(workerId, stats) {
        const worker = this.getWorkerAssert(workerId);
        worker.byteCount -= stats.size;
        worker.fileCount--;
    }
    async getNextWorker(path) {
        const { logger, memoryFs, fileAllocator } = this.master;
        // Get stats first
        let stats = memoryFs.getFileStats(path);
        if (stats === undefined) {
            // Give memoryFs a chance to finish initializing if it's in a pending project
            await this.master.memoryFs.waitIfInitializingWatch(path);
            stats = memoryFs.getFileStats(path);
            if (stats === undefined) {
                console.error(Array.from(memoryFs.files.keys(), (path) => path.join()));
                throw new Error(`The file ${path.join()} doesn't exist`);
            }
        }
        // Verify that this file doesn't exceed any size limit
        fileAllocator.verifySize(path, stats);
        // Lock in case we're in the process of swapping the master worker with a dedicated worker
        await this.locker.waitLock(0);
        // If the worker is running in the master process and we've exceed our byte limit
        // then start up a dedicated worker process
        if (this.selfWorker) {
            const worker = this.getWorkerAssert(0);
            if (worker.byteCount > constants_1.MAX_MASTER_BYTES_BEFORE_WORKERS) {
                await this.replaceOwnWorker();
            }
        }
        // Find the worker with the lowest owned byte size
        const smallestWorker = this.getLowestByteCountWorker();
        let workerId = smallestWorker.id;
        // When the smallest worker exceeds the max worker byte limit and we're still under
        // our max worker limit, then let's start a new one
        if (smallestWorker.byteCount > constants_1.MAX_WORKER_BYTES_BEFORE_ADD &&
            this.getWorkerCount() < core_1.MAX_WORKER_COUNT) {
            logger.info(`[WorkerManager] Spawning a new worker as we've exceeded ${constants_1.MAX_WORKER_BYTES_BEFORE_ADD} bytes across each worker`);
            workerId = this.getNextWorkerId();
            await this.spawnWorker(workerId);
        }
        // Register size of file
        this.own(workerId, stats);
        // Just in case we've chosen a worker that's still spawning
        await this.locker.waitLock(workerId);
        return this.getWorkerAssert(workerId);
    }
}
exports.default = WorkerManager;
