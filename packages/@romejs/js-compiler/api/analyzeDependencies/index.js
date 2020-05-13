"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const records_1 = require("./records");
const js_compiler_1 = require("@romejs/js-compiler");
const transform_1 = require("../../methods/transform");
const index_1 = require("./visitors/index");
const diagnostics_1 = require("@romejs/diagnostics");
const analyzeCache = new js_compiler_1.Cache();
async function analyzeDependencies(req) {
    let { ast, project } = req;
    const query = js_compiler_1.Cache.buildQuery(req);
    const cached = analyzeCache.get(query);
    if (cached) {
        return cached;
    }
    const context = new js_compiler_1.CompilerContext({
        ref: req.ref,
        sourceText: req.sourceText,
        ast,
        project,
        origin: {
            category: 'analyzeDependencies',
        },
    });
    ({ ast } = await transform_1.default({ ...req, stage: 'pre' }));
    context.reduce(ast, index_1.default);
    //
    const importFirstUsage = [];
    const seenImportFirstUsage = new Set();
    // Extract records
    const exports = [];
    const dependenciesBySource = new Map();
    const esValueExports = [];
    const cjsExports = [];
    let firstTopAwaitLocation;
    // TODO description
    let hasCJSRef = false;
    // Whether we have a default export, used to automatically add one for CJS
    let hasDefaultExport = false;
    // Find the import sources that are only used as a type
    const sourcesUsedAsType = new Set();
    const sourcesUsedAsValue = new Set();
    for (const record of context.records) {
        let data;
        if (record instanceof records_1.ImportUsageRecord) {
            data = record.data;
        }
        // This has to be a separate if or else TS wont refine it...
        if (record instanceof records_1.ExportRecord && record.data.type !== 'local') {
            data = record.data;
        }
        if (data !== undefined) {
            const { kind, source } = data;
            if (kind === 'type') {
                sourcesUsedAsType.add(source);
            }
            else {
                sourcesUsedAsValue.add(source);
            }
        }
    }
    for (const source of sourcesUsedAsValue) {
        sourcesUsedAsType.delete(source);
    }
    // Process rest of the records
    for (const record of context.records) {
        if (record instanceof records_1.EscapedCJSRefRecord) {
            exports.push({
                type: 'local',
                loc: record.node.loc,
                kind: 'value',
                valueType: 'other',
                name: '*',
            });
        }
        if (record instanceof records_1.ImportRecord) {
            let { data } = record;
            // If this source was only ever used as a type then convert us to a value
            if (data.type === 'es' &&
                data.kind === 'value' &&
                sourcesUsedAsType.has(data.source)) {
                const names = [];
                for (const name of data.names) {
                    names.push({
                        ...name,
                        kind: 'type',
                    });
                }
                data = { ...data, kind: 'type', names };
            }
            // If we have multiple import records for this file, then merge them together
            const existing = dependenciesBySource.get(data.source);
            if (existing === undefined) {
                dependenciesBySource.set(data.source, data);
            }
            else {
                let kind;
                if (data.kind === existing.kind) {
                    kind = data.kind;
                }
                else {
                    kind = 'value';
                }
                const combinedRecord = {
                    type: data.type === 'es' && existing.type === 'es' ? 'es' : 'cjs',
                    kind,
                    optional: existing.optional && data.optional,
                    async: existing.async || data.async,
                    source: data.source,
                    all: existing.all || data.all,
                    names: [...existing.names, ...data.names],
                    loc: existing.loc || data.loc,
                };
                // Map ordering is by insertion time, so in the case where the previous import was a type import
                // then we don't want to place our combined record in that position, it should be at the end.
                // Inserting a type import statement at the top of the file shouldn't change the execution order
                // if it was imported later
                if (existing.kind === 'type' && data.kind === 'value') {
                    dependenciesBySource.delete(data.source);
                }
                dependenciesBySource.set(data.source, combinedRecord);
            }
        }
        else if (record instanceof records_1.ExportRecord) {
            exports.push(record.data);
        }
        else if (record instanceof records_1.CJSVarRefRecord) {
            hasCJSRef = true;
        }
        else if (record instanceof records_1.CJSExportRecord) {
            cjsExports.push(record.node);
        }
        else if (record instanceof records_1.ESExportRecord) {
            // No point checking for ES imported in CJS because it would have been a syntax error
            if (record.kind === 'value') {
                esValueExports.push(record.node);
            }
        }
        else if (record instanceof records_1.TopLevelAwaitRecord) {
            if (firstTopAwaitLocation === undefined) {
                firstTopAwaitLocation = record.loc;
            }
        }
        else if (record instanceof records_1.ImportUsageRecord &&
            record.isTop &&
            record.data.kind === 'value') {
            // Track the first reference to a value import that's not in a function
            // This is used to detect module cycles
            const { data } = record;
            const key = `${data.source}:${data.imported}`;
            if (seenImportFirstUsage.has(key)) {
                continue;
            }
            seenImportFirstUsage.add(key);
            importFirstUsage.push(data);
        }
    }
    // Build dependencies
    const dependencies = Array.from(dependenciesBySource.values());
    // Infer the module type
    let moduleType = ast.sourceType === 'script' ? 'cjs' : 'es';
    // Infer module type in legacy mode
    if (project.config.bundler.mode === 'legacy') {
        if (cjsExports.length > 0) {
            moduleType = 'cjs';
        }
        else if (esValueExports.length > 0) {
            moduleType = 'es';
        }
        else if (hasCJSRef) {
            moduleType = 'cjs';
        }
        else {
            moduleType = 'unknown';
        }
    }
    //
    for (const record of context.records) {
        if (record instanceof records_1.CJSVarRefRecord) {
            if (project.config.bundler.mode === 'modern' && moduleType === 'es') {
                /*context.addNodeDiagnostic(record.node, {
                  category: 'analyzeDependencies',
                  message: `CommonJS variable <emphasis>${
                    record.node.name
                  }</emphasis> is not available in an ES module`,
                });*/
            }
        }
        else if (record instanceof records_1.CJSExportRecord) {
            if (moduleType === 'es') {
                context.addNodeDiagnostic(record.node, diagnostics_1.descriptions.ANALYZE_DEPENDENCIES.CJS_EXPORT_IN_ES);
            }
        }
    }
    // Add an implicit default import for CJS if there is none
    if (moduleType === 'cjs' && !hasDefaultExport) {
        exports.push({
            type: 'local',
            loc: undefined,
            kind: 'value',
            valueType: 'other',
            name: 'default',
        });
    }
    const topLevelLocalBindings = {};
    // Get all top level bindings
    for (const [name, binding] of context.getRootScope().evaluate(ast).getOwnBindings()) {
        topLevelLocalBindings[name] = binding.node.loc;
    }
    const res = {
        topLevelLocalBindings,
        moduleType,
        firstTopAwaitLocation,
        exports,
        dependencies,
        importFirstUsage,
        syntax: ast.syntax,
        diagnostics: [...ast.diagnostics, ...context.diagnostics.getDiagnostics()],
    };
    analyzeCache.set(query, res);
    return res;
}
exports.default = analyzeDependencies;
function mergeAnalyzeDependencies(main, second) {
    const exports = [...main.exports];
    // Take only local type exports
    for (const exp of second.exports) {
        if (exp.type === 'local' && exp.kind === 'type') {
            exports.push(exp);
        }
        // Ensure that all external exports are only reachable with `type`
        if (exp.type === 'external' || exp.type === 'externalAll') {
            exports.push({
                ...exp,
                kind: 'type',
            });
        }
    }
    return {
        ...main,
        exports,
        diagnostics: [...main.diagnostics, ...second.diagnostics],
    };
}
exports.mergeAnalyzeDependencies = mergeAnalyzeDependencies;
