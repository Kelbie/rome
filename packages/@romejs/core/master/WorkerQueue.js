"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class WorkerQueue {
    constructor(master, maxPer = 2) {
        this.master = master;
        this.callbacks = [];
        this.runningWorkers = [];
        this.workers = new Map();
        this.open = true;
        this.maxPer = maxPer;
    }
    async pushQueue(path, metadata) {
        if (!this.open) {
            throw new Error('WorkerQueue has already closed');
        }
        if (this.callbacks.length === 0) {
            throw new Error('No callbacks attached to queue');
        }
        const workerContainer = await this.master.fileAllocator.getOrAssignOwner(path);
        // Populate the worker queue for this item
        let worker = this.workers.get(workerContainer);
        if (worker === undefined) {
            worker = {
                running: false,
                queue: [],
            };
            this.workers.set(workerContainer, worker);
        }
        worker.queue.push([path, metadata]);
        // Start this worker if it isn't already
        if (worker.running === false) {
            const promise = this.processWorker(worker);
            // Add a `catch` so that we aren't considered an unhandled promise if it rejects before a handler is attached
            promise.catch(() => { });
            this.runningWorkers.push(promise);
        }
    }
    addCallback(callback) {
        this.callbacks.push(callback);
    }
    async processWorker(worker) {
        worker.running = true;
        const { queue } = worker;
        const next = async () => {
            const item = queue.shift();
            if (item === undefined) {
                // Exhausted queue
                return;
            }
            const [filename, metadata] = item;
            for (const callback of this.callbacks) {
                await callback(filename, metadata);
            }
            await next();
        };
        while (queue.length > 0) {
            // "threads"
            const threads = [];
            for (let i = 0; i < this.maxPer; i++) {
                threads.push(next());
            }
            await Promise.all(threads);
        }
        worker.running = false;
    }
    async spin() {
        while (
        // Keep consuming all the promises until we're exhausted
        this.runningWorkers.length >
            0) {
            const { runningWorkers } = this;
            this.runningWorkers = [];
            await Promise.all(runningWorkers);
        }
        // Ensure we never receive anymore queue items
        this.open = false;
    }
}
exports.default = WorkerQueue;
