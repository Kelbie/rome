"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./rules/index");
const js_compiler_1 = require("@romejs/js-compiler");
const js_formatter_1 = require("@romejs/js-formatter");
const suppressions_1 = require("./suppressions");
const lintCache = new js_compiler_1.Cache();
async function lint(req) {
    const { ast, sourceText, project, applyFixes, options } = req;
    const query = js_compiler_1.Cache.buildQuery(req, { applyFixes });
    const cached = lintCache.get(query);
    if (cached) {
        return cached;
    }
    // Perform autofixes
    const formatContext = new js_compiler_1.CompilerContext({
        ref: req.ref,
        sourceText: req.sourceText,
        options,
        ast,
        project,
        frozen: false,
        origin: {
            category: 'lint',
        },
    });
    let formatAst = ast;
    if (applyFixes) {
        formatAst = formatContext.reduceRoot(ast, index_1.lintTransforms);
        formatAst = suppressions_1.addSuppressions(formatContext, formatAst);
    }
    const formattedCode = js_formatter_1.formatJS(formatAst, {
        typeAnnotations: true,
        sourceMaps: true,
        format: 'pretty',
        sourceText,
    }).code;
    // Run lints (could be with the autofixed AST)
    const context = new js_compiler_1.CompilerContext({
        ref: req.ref,
        sourceText: req.sourceText,
        ast,
        project,
        options,
        origin: {
            category: 'lint',
        },
        frozen: true,
    });
    context.reduceRoot(ast, index_1.lintTransforms);
    const diagnostics = context.diagnostics.getDiagnostics();
    const result = {
        suppressions: context.suppressions,
        diagnostics: [...ast.diagnostics, ...diagnostics],
        src: formattedCode,
    };
    lintCache.set(query, result);
    return result;
}
exports.default = lint;
