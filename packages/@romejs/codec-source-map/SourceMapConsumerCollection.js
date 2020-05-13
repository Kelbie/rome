"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class SourceMapConsumerCollection {
    constructor() {
        this.maps = new Map();
    }
    hasAny() {
        return this.maps.size > 0;
    }
    has(file) {
        return file !== undefined && this.maps.has(file);
    }
    add(file, map) {
        this.maps.set(file, map);
    }
    get(file) {
        return this.maps.get(file);
    }
    approxOriginalPositionFor(file, line, column) {
        const map = this.get(file);
        if (map === undefined) {
            return undefined;
        }
        else {
            return map.approxOriginalPositionFor(line, column);
        }
    }
    exactOriginalPositionFor(file, line, column) {
        const map = this.get(file);
        if (map === undefined) {
            return undefined;
        }
        else {
            return map.exactOriginalPositionFor(line, column);
        }
    }
}
exports.default = SourceMapConsumerCollection;
