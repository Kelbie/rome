"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const DependencyOrderer_1 = require("./DependencyOrderer");
const path_1 = require("@romejs/path");
const fileHandlers_1 = require("../../common/fileHandlers");
function equalKind(producer, consumerKind) {
    // Allow importing functions and classes as `type` and `typeof`
    if (producer.type === 'local' &&
        (producer.valueType === 'class' || producer.valueType === 'function') &&
        (consumerKind === 'type' || consumerKind === 'typeof')) {
        return true;
    }
    // You can only import a type or a class as a type
    if (producer.kind === 'type') {
        return consumerKind === 'type';
    }
    // You can only import a value as a value or typeof
    if (producer.kind === 'value') {
        return consumerKind === 'typeof' || consumerKind === 'value';
    }
    return false;
}
class DependencyNode {
    constructor(graph, ref, res) {
        this.graph = graph;
        this.project = graph.master.projectManager.assertProjectExisting(ref.real);
        this.uid = ref.uid;
        this.path = ref.real;
        this.ref = ref;
        this.type = res.moduleType;
        this.usedAsync = false;
        this.all = false;
        this.relativeToAbsolutePath = new Map();
        this.absoluteToAnalyzeDependency = new path_1.AbsoluteFilePathMap();
        this.analyze = res;
        const { handler } = fileHandlers_1.getFileHandler(ref.real, this.project.config);
        this.handler = handler;
    }
    getMtime() {
        return this.graph.master.memoryFs.getMtime(this.path);
    }
    setUsedAsync(usedAsync) {
        this.usedAsync = usedAsync;
    }
    setAll(all) {
        this.all = all;
    }
    hasEscapedExports() {
        for (const exp of this.analyze.exports) {
            if (exp.type === 'local' && exp.name === '*') {
                return true;
            }
        }
        return false;
    }
    getDependents() {
        const dependents = [];
        for (const node of this.graph.nodes.values()) {
            if (node.absoluteToAnalyzeDependency.has(this.path)) {
                dependents.push(node);
            }
        }
        return dependents;
    }
    addDependency(relative, absolute, dep) {
        this.relativeToAbsolutePath.set(relative, absolute);
        this.absoluteToAnalyzeDependency.set(absolute, {
            analyze: dep,
            path: absolute,
        });
    }
    getDependencyInfoFromAbsolute(path) {
        const dep = this.absoluteToAnalyzeDependency.get(path);
        if (dep === undefined) {
            throw new Error('Expected dependency');
        }
        return dep;
    }
    getNodeFromRelativeDependency(relative) {
        const absolute = this.relativeToAbsolutePath.get(relative);
        if (absolute === undefined) {
            throw new Error(`Expected dependency ${relative} in ${this.path}`);
        }
        return this.graph.getNode(absolute);
    }
    getAbsoluteDependencies() {
        return Array.from(this.relativeToAbsolutePath.values());
    }
    getTransitiveDependencies() {
        let queue = [this];
        const nodes = new Set();
        while (queue.length > 0) {
            const node = queue.shift();
            if (node === undefined) {
                throw new Error('Already validated queue.length');
            }
            nodes.add(node);
            for (const absolute of node.getAbsoluteDependencies()) {
                const node = this.graph.getNode(absolute);
                if (!nodes.has(node)) {
                    queue.push(node);
                }
            }
        }
        return Array.from(nodes);
    }
    getDependencyOrder() {
        const orderer = new DependencyOrderer_1.default(this.graph);
        return orderer.order(this.path);
    }
    // Get a list of all DependencyNodes where exports could be resolved. eg. `export *`
    getExportedModules(chain = new Set()) {
        if (chain.has(this)) {
            return new Set();
        }
        else {
            chain.add(this);
        }
        for (const exp of this.analyze.exports) {
            if (exp.type === 'externalAll' &&
                this.relativeToAbsolutePath.has(exp.source)) {
                this.getNodeFromRelativeDependency(exp.source).getExportedModules(chain);
            }
        }
        return chain;
    }
    getExportedNames(kind, seen = new Set()) {
        if (seen.has(this)) {
            return new Set();
        }
        else {
            seen.add(this);
        }
        let names = new Set();
        for (const exp of this.analyze.exports) {
            if (!equalKind(exp, kind)) {
                continue;
            }
            switch (exp.type) {
                case 'local': {
                    names.add(exp.name);
                    break;
                }
                case 'external': {
                    const resolved = this.getNodeFromRelativeDependency(exp.source).resolveImport(exp.imported, exp.loc);
                    if (resolved.type === 'FOUND' && equalKind(resolved.record, kind)) {
                        names.add(exp.exported);
                    }
                    break;
                }
                case 'externalNamespace': {
                    names.add(exp.exported);
                    break;
                }
                case 'externalAll': {
                    names = new Set([
                        ...names,
                        ...this.getNodeFromRelativeDependency(exp.source).getExportedNames(kind, seen),
                    ]);
                    break;
                }
            }
        }
        return names;
    }
    buildDiagnosticForUnknownExport(kind, resolved) {
        const location = {
            ...resolved.loc,
            mtime: this.getMtime(),
        };
        const expectedName = resolved.name;
        const fromSource = resolved.node.uid;
        // Check if there was a matching local in any of the exported modules
        for (const mod of resolved.node.getExportedModules()) {
            // We use an object as a hash map so need to check for pollution
            if (Object.prototype.hasOwnProperty.call(mod.analyze.topLevelLocalBindings, expectedName)) {
                const localLoc = mod.analyze.topLevelLocalBindings[expectedName];
                if (localLoc !== undefined) {
                    return {
                        description: diagnostics_1.descriptions.RESOLVER.UNKNOWN_EXPORT_POSSIBLE_UNEXPORTED_LOCAL(expectedName, fromSource, localLoc),
                        location,
                    };
                }
            }
        }
        return {
            description: diagnostics_1.descriptions.RESOLVER.UNKNOWN_EXPORT(expectedName, fromSource, Array.from(resolved.node.getExportedNames(kind)), (name) => {
                const exportInfo = resolved.node.resolveImport(name, undefined);
                if (exportInfo.type === 'NOT_FOUND') {
                    throw new Error(`mod.resolveImport returned NOT_FOUND for an export ${name} in ${exportInfo.node.path} despite being returned by getExportedNames`);
                }
                return {
                    location: exportInfo.record.loc,
                    source: exportInfo.node === resolved.node
                        ? undefined
                        : exportInfo.node.path.join(),
                };
            }),
            location,
        };
    }
    buildDiagnosticForTypeMismatch(resolved, node, nameInfo) {
        const { name, kind, loc } = nameInfo;
        const { record } = resolved;
        return {
            description: diagnostics_1.descriptions.RESOLVER.IMPORT_TYPE_MISMATCH(name, node.uid, kind, record.kind, record.loc),
            location: {
                ...loc,
                mtime: this.getMtime(),
            },
        };
    }
    resolveImports() {
        const cached = this.resolveImportsCache;
        if (cached !== undefined) {
            return cached;
        }
        const { graph } = this;
        // Build up a map of any forwarded imports
        const resolvedImports = {};
        // Diagnostics for unknown imports
        const diagnostics = [];
        // Go through all of our dependencies and check if they have any external exports to forward
        const allowTypeImportsAsValue = this.analyze.syntax.includes('ts');
        for (const absolute of this.relativeToAbsolutePath.values()) {
            const mod = graph.getNode(absolute);
            // We can't follow CJS names
            if (mod.type === 'cjs') {
                continue;
            }
            const usedNames = this.getDependencyInfoFromAbsolute(absolute).analyze.names;
            // Try to resolve these exports
            for (const nameInfo of usedNames) {
                const { name, kind, loc } = nameInfo;
                if (kind === 'type' || kind === 'typeof') {
                    // Disable resolving typed imports for now as there's ridiculous code that hides some behind $FlowFixMe
                    continue;
                }
                const resolved = mod.resolveImport(name, loc);
                // Unknown import
                if (resolved.type === 'NOT_FOUND') {
                    diagnostics.push(this.buildDiagnosticForUnknownExport(kind, resolved));
                    continue;
                }
                // Flag imports of the wrong type
                if (!allowTypeImportsAsValue && !equalKind(resolved.record, kind)) {
                    diagnostics.push(this.buildDiagnosticForTypeMismatch(resolved, mod, nameInfo));
                    continue;
                }
                // If the resolved target isn't the same as the file then forward it
                if (resolved.node.uid !== mod.uid) {
                    resolvedImports[`${mod.uid}:${name}`] = {
                        id: resolved.node.uid,
                        name: resolved.record.name,
                    };
                }
            }
        }
        const result = {
            resolved: resolvedImports,
            diagnostics,
        };
        this.resolveImportsCache = result;
        return result;
    }
    resolveImport(name, loc, ignoreDefault = false, ancestry = []) {
        if (ancestry.includes(this)) {
            return {
                type: 'NOT_FOUND',
                loc,
                node: this,
                name,
            };
        }
        const subAncestry = [...ancestry, this];
        // We always want to resolve exports from the bottom up
        const exports = this.analyze.exports.reverse();
        for (const record of exports) {
            // When resolving exportAll we never want to include the default export of those modules
            if (record.type === 'local' && record.name === 'default' && ignoreDefault) {
                continue;
            }
            if (record.type === 'local' &&
                (record.name === name || record.name === '*')) {
                return {
                    type: 'FOUND',
                    node: this,
                    record,
                };
            }
            if (record.type === 'external' && record.exported === name) {
                return this.getNodeFromRelativeDependency(record.source).resolveImport(record.imported, record.loc, false, subAncestry);
            }
            if (record.type === 'externalAll') {
                const resolved = this.getNodeFromRelativeDependency(record.source).resolveImport(name, record.loc, true, subAncestry);
                if (resolved.type === 'FOUND') {
                    return resolved;
                }
            }
        }
        return {
            type: 'NOT_FOUND',
            loc,
            node: this,
            name,
        };
    }
}
exports.default = DependencyNode;
