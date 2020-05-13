"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const buildGraph_1 = require("./buildGraph");
const E_1 = require("../types/errors/E");
const exportsCache = new WeakMap();
async function getModuleSignature(opts) {
    const { ast, provider } = opts;
    const { filename } = ast;
    if (filename.includes('node_modules')) {
        return {
            filename,
            exports: [],
            types: {},
        };
    }
    const cached = exportsCache.get(ast);
    if (cached !== undefined) {
        return cached;
    }
    const { evaluator: { exports }, utils, } = await buildGraph_1.default({
        ast,
        project: opts.project,
        connected: false,
        provider,
    });
    const types = {};
    const exportMap = [];
    const added = new Set();
    function addType(type) {
        const reducedType = utils.reduce(type);
        if (added.has(reducedType)) {
            return reducedType.id;
        }
        else {
            added.add(reducedType);
        }
        // export errors as any types to suppress errors
        if (reducedType instanceof E_1.default) {
            types[reducedType.id] = {
                human: undefined,
                origin: reducedType.originLoc,
                type: 'AnyT',
                data: {},
            };
            return reducedType.id;
        }
        const data = reducedType.serialize(addType);
        types[reducedType.id] = {
            human: reducedType.human,
            origin: reducedType.originLoc,
            type: reducedType.getConstructor().type,
            data,
        };
        return reducedType.id;
    }
    for (const def of exports) {
        if (def.type === 'all') {
            exportMap.push({
                type: 'all',
                source: def.source,
            });
        }
        else if (def.type === 'local') {
            exportMap.push({
                type: 'local',
                name: def.name,
                value: addType(def.value),
            });
        }
        else {
            throw new Error('unknown export def type');
        }
    }
    const result = {
        filename,
        exports: exportMap,
        types,
    };
    exportsCache.set(ast, result);
    return result;
}
exports.default = getModuleSignature;
