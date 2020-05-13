"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../transforms/index");
const js_compiler_1 = require("@romejs/js-compiler");
const CompilerContext_1 = require("../lib/CompilerContext");
const transformCaches = index_1.stageOrder.map(() => new js_compiler_1.Cache());
async function transform(req) {
    const stage = req.stage === undefined ? 'compile' : req.stage;
    const { options, project } = req;
    let ast = req.ast;
    const cacheQuery = js_compiler_1.Cache.buildQuery(req);
    const stageNo = index_1.stageOrder.indexOf(stage);
    // Check this exact stage cache
    const stageCache = transformCaches[stageNo];
    const cached = stageCache.get(cacheQuery);
    if (cached !== undefined) {
        return cached;
    }
    let prevStageDiagnostics = [];
    let prevStageCacheDeps = [];
    let suppressions;
    // Run the previous stage
    if (stageNo > 0) {
        const prevStage = await transform({ ...req, stage: index_1.stageOrder[stageNo - 1] });
        prevStageDiagnostics = prevStage.diagnostics;
        prevStageCacheDeps = prevStage.cacheDependencies;
        ast = prevStage.ast;
        suppressions = prevStage.suppressions;
    }
    const context = new CompilerContext_1.default({
        suppressions,
        ref: req.ref,
        sourceText: req.sourceText,
        ast,
        project,
        options,
        origin: {
            category: 'transform',
        },
    });
    const transformFactory = index_1.stageTransforms[stage];
    const transforms = transformFactory(project.config, options);
    let visitors = await context.normalizeTransforms(transforms);
    const compiledAst = context.reduceRoot(ast, visitors);
    const res = {
        suppressions: context.suppressions,
        diagnostics: [
            ...prevStageDiagnostics,
            ...context.diagnostics.getDiagnostics(),
        ],
        cacheDependencies: [
            ...prevStageCacheDeps,
            ...context.getCacheDependencies(),
        ],
        ast: compiledAst,
    };
    stageCache.set(cacheQuery, res);
    return res;
}
exports.default = transform;
