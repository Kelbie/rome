"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
let projectIdCounter = 0;
const projectToId = new WeakMap();
class Cache {
    constructor() {
        this.cache = new WeakMap();
    }
    static buildQuery(req, additionalOptions) {
        const { ast, project, options } = req;
        const keyParts = [];
        let projectId = projectToId.get(project);
        if (projectId === undefined) {
            projectId = projectIdCounter++;
            projectToId.set(project, projectId);
        }
        // Add project config cache counter
        keyParts.push(String(projectId));
        // Add options if they exist
        const extra = {
            ...options,
            ...additionalOptions,
        };
        if (Object.keys(extra).length > 0) {
            keyParts.push(JSON.stringify(extra));
        }
        return {
            ast,
            key: keyParts.join(';'),
        };
    }
    get(query) {
        const astCache = this.cache.get(query.ast);
        if (astCache) {
            return astCache.get(query.key);
        }
        else {
            return undefined;
        }
    }
    set(query, value) {
        let astCache = this.cache.get(query.ast);
        if (astCache === undefined) {
            astCache = new Map();
            this.cache.set(query.ast, astCache);
        }
        astCache.set(query.key, value);
    }
}
exports.default = Cache;
