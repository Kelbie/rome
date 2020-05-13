"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Lock {
    constructor(locker, key) {
        this.locker = locker;
        this.resolves = [];
        this.key = key;
    }
    addResolve(resolve) {
        this.resolves.push(resolve);
    }
    release() {
        const { resolves } = this;
        if (resolves.length === 0) {
            this.locker.locks.delete(this.key);
        }
        else {
            const resolve = resolves.shift();
            if (resolve === undefined) {
                throw new Error('Already validated resolved.length aboved');
            }
            resolve(this);
        }
    }
}
class Locker {
    constructor() {
        this.locks = new Map();
    }
    hasLock(id) {
        return this.locks.has(id);
    }
    getNewLock(key) {
        if (this.locks.has(key)) {
            throw new Error('Expected no lock to exist');
        }
        const lock = new Lock(this, key);
        this.locks.set(key, lock);
        return lock;
    }
    async getLock(key) {
        const existingLock = this.locks.get(key);
        if (existingLock === undefined) {
            return this.getNewLock(key);
        }
        else {
            return new Promise((resolve) => {
                existingLock.addResolve(resolve);
            });
        }
    }
    async waitLock(key) {
        if (this.hasLock(key)) {
            const lock = await this.getLock(key);
            lock.release();
        }
    }
}
exports.default = Locker;
