"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Intrinsics_1 = require("./Intrinsics");
const scopes_1 = require("./scopes");
const UnknownImportE_1 = require("./types/errors/UnknownImportE");
const EmptyT_1 = require("./types/EmptyT");
const OpenT_1 = require("./types/OpenT");
const index_1 = require("./types/index");
const index_2 = require("./evaluators/index");
class ModuleSignatureManager {
    constructor(graph, getModuleSignature, topScope) {
        this.topScope = topScope;
        this.getModuleSignature = getModuleSignature;
        this.graph = graph;
        this.openTypes = new Map();
        this.filename = graph.filename;
        this.exportNamesToTypeId = new Map();
    }
    addAll(manager) {
        for (const [name, id] of manager.exportNamesToTypeId) {
            if (name === 'default') {
                // ignore `default`
                continue;
            }
            this.exportNamesToTypeId.set(name, id);
            const openType = manager.openTypes.get(id);
            if (openType === undefined) {
                throw new Error('Expected an open type');
            }
            this.openTypes.set(id, openType);
        }
    }
    async init() {
        const { graph, openTypes } = this;
        // Create initial open types for all the nodes in this graph
        for (const id in graph.types) {
            const open = new OpenT_1.default(this.topScope, undefined);
            openTypes.set(id, open);
        }
        let currGetType;
        // Create a factory to fetch the open ids
        const getType = (id) => {
            if (id === undefined) {
                throw new Error('expected id');
            }
            if (typeof id !== 'string') {
                throw new Error('expected string id');
            }
            const type = openTypes.get(id);
            if (type === undefined) {
                throw new Error(`${graph.filename}: Expected type of id ${id} but it doesn't exist, serialized data: ${String(JSON.stringify(currGetType))}`);
            }
            return type;
        };
        // Fetch the graphs of `export *` dependencies, future calls to `this.getModuleSignature` will fetch from 'cache
        await Promise.all(graph.exports.map((def) => {
            if (def.type === 'all') {
                return this.getModuleSignature(def.source, graph.filename);
            }
            else {
                return undefined;
            }
        }));
        // Resolve all exports
        for (const def of graph.exports) {
            if (def.type === 'all') {
                const manager = await this.getModuleSignature(def.source, graph.filename);
                if (manager !== undefined) {
                    this.addAll(manager);
                }
            }
            else {
                this.exportNamesToTypeId.set(def.name, def.value);
            }
        }
        // Hydrate all types in the graph and link them to their open types
        for (const id in graph.types) {
            const node = graph.types[id];
            const { origin, type, data, human } = node;
            currGetType = node;
            // Retrieve the open type
            const openT = openTypes.get(id);
            if (openT === undefined) {
                throw new Error('Expected an open type');
            }
            // Get the type constructor
            const TConstructor = index_1.default.get(type);
            if (TConstructor === undefined) {
                throw new Error('Expected a valid internal type constructor name');
            }
            // Create the type
            // @ts-ignore
            const realT = TConstructor.hydrate(this.topScope, { loc: origin }, data, getType);
            //
            realT.setHuman(human);
            // Link it to the open type
            openT.shouldMatch(realT);
        }
    }
    link(importedName, type) {
        const graph = this.graph;
        // Get type id for this export
        const maybeExportId = this.exportNamesToTypeId.get(importedName);
        if (maybeExportId === undefined) {
            // Export not found in the module so let's link it to an error
            const error = new UnknownImportE_1.default(this.topScope, type.originNode, {
                possibleNames: Array.from(this.exportNamesToTypeId.keys()),
                importedName,
                source: graph.filename,
            });
            error.shouldMatch(type);
            return;
        }
        // Retrieve the open type
        const openT = this.openTypes.get(maybeExportId);
        if (openT === undefined) {
            throw new Error('Expected an open type');
        }
        // Link it to this type
        type.setResolvedType(openT);
    }
}
exports.ModuleSignatureManager = ModuleSignatureManager;
class Evaluator {
    constructor(hub, filename) {
        this.filename = filename;
        this.nodeToType = new Map();
        this.exports = [];
        this.imports = [];
        this.hub = hub;
        this.graph = hub.graph;
        // TODO we should use `ThisScope` and set it correctly to `window` or `undefined` depending on strict mode
        this.topScope = new scopes_1.Scope({ evaluator: this });
        this.intrinsics = this.topScope.intrinsics = new Intrinsics_1.default(this.topScope);
        this.evaluatingType = undefined;
    }
    initModuleSignature(graph, getModuleSignature) {
        return new ModuleSignatureManager(graph, getModuleSignature, this.topScope);
    }
    seed(ast) {
        return this.evaluate(ast, this.topScope);
    }
    evaluate(node, scope) {
        if (node === undefined) {
            throw new Error('Expected node but received undefined');
        }
        const evaluator = index_2.default.get(node.type);
        if (evaluator === undefined) {
            throw new Error(`what is this? ${node.type}`);
        }
        else {
            const oldEvaluatingType = this.evaluatingType;
            this.evaluatingType = node.type;
            let type = evaluator(node, scope, this.hub);
            if (type === undefined) {
                type = new EmptyT_1.default(scope, node);
            }
            this.evaluatingType = oldEvaluatingType;
            this.nodeToType.set(node, type);
            return type;
        }
    }
    getTypeFromEvaluatedNode(node) {
        const type = this.nodeToType.get(node);
        if (type === undefined) {
            throw new Error('getTypeFromEvaluatedNode() called on a node that has not been validated yet');
        }
        else {
            return type;
        }
    }
    addExport(name, type) {
        this.exports.push({
            type: 'local',
            name,
            value: type,
        });
    }
    addExportAll(source) {
        this.exports.push({
            type: 'all',
            source,
        });
    }
    addImport(t, opts) {
        this.imports.push({
            relative: opts.relative,
            importedName: opts.importedName,
            source: opts.source,
            type: t,
        });
    }
}
exports.default = Evaluator;
