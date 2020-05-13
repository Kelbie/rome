"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Sometimes we don't want to have to deal with what a FilePath serializes into
// For those purposes we have these wrappers around Map and Set. Here we can add some custom logic
// to speed up the usage of FilePaths in these scenarios.
// The API here attempts to match what is expected from the native classes, however we may deviate from it
// to avoid the usage of getters and generator/symbol indirection for iteration.
class FilePathMap {
    constructor(entries) {
        this.joinedToValue = new Map();
        this.joinedToPath = new Map();
        this.size = 0;
        if (entries !== undefined) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }
    _updateSize() {
        this.size = this.joinedToValue.size;
    }
    *[Symbol.iterator]() {
        for (const [joined, value] of this.joinedToValue) {
            const path = this.joinedToPath.get(joined);
            yield [path, value];
        }
    }
    clear() {
        this.joinedToValue.clear();
        this.joinedToPath.clear();
        this._updateSize();
    }
    keys() {
        return this.joinedToPath.values();
    }
    values() {
        return this.joinedToValue.values();
    }
    delete(path) {
        const joined = path.getUnique().join();
        this.joinedToValue.delete(joined);
        this.joinedToPath.delete(joined);
        this._updateSize();
    }
    has(path) {
        return this.joinedToValue.has(path.getUnique().join());
    }
    get(path) {
        return this.joinedToValue.get(path.getUnique().join());
    }
    set(path, value) {
        const uniq = path.getUnique();
        const joined = uniq.join();
        this.joinedToValue.set(joined, value);
        this.joinedToPath.set(joined, uniq);
        this._updateSize();
    }
}
class FilePathSet {
    constructor(entries) {
        this.map = new FilePathMap();
        this.size = 0;
        if (entries !== undefined) {
            for (const path of entries) {
                this.add(path);
            }
        }
    }
    _updateSize() {
        this.size = this.map.size;
    }
    [Symbol.iterator]() {
        return this.map.keys()[Symbol.iterator]();
    }
    has(path) {
        return this.map.has(path);
    }
    add(path) {
        this.map.set(path);
        this._updateSize();
    }
    delete(path) {
        this.map.delete(path);
        this._updateSize();
    }
    clear() {
        this.map.clear();
        this._updateSize();
    }
}
class AbsoluteFilePathMap extends FilePathMap {
    constructor() {
        super(...arguments);
        this.type = 'absolute';
    }
}
exports.AbsoluteFilePathMap = AbsoluteFilePathMap;
class RelativeFilePathMap extends FilePathMap {
    constructor() {
        super(...arguments);
        this.type = 'relative';
    }
}
exports.RelativeFilePathMap = RelativeFilePathMap;
class UnknownFilePathMap extends FilePathMap {
    constructor() {
        super(...arguments);
        this.type = 'unknown';
    }
}
exports.UnknownFilePathMap = UnknownFilePathMap;
class AbsoluteFilePathSet extends FilePathSet {
    constructor() {
        super(...arguments);
        this.type = 'absolute';
    }
}
exports.AbsoluteFilePathSet = AbsoluteFilePathSet;
class RelativeFilePathSet extends FilePathSet {
    constructor() {
        super(...arguments);
        this.type = 'relative';
    }
}
exports.RelativeFilePathSet = RelativeFilePathSet;
class UnknownFilePathSet extends FilePathSet {
    constructor() {
        super(...arguments);
        this.type = 'unknown';
    }
}
exports.UnknownFilePathSet = UnknownFilePathSet;
