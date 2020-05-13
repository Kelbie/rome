"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_source_map_1 = require("@romejs/codec-source-map");
const js_compiler_1 = require("@romejs/js-compiler");
const js_formatter_1 = require("@romejs/js-formatter");
const transform_1 = require("../methods/transform");
const compileCache = new js_compiler_1.Cache();
async function compile(req) {
    const { sourceText, ast } = req;
    const query = js_compiler_1.Cache.buildQuery(req);
    const cached = compileCache.get(query);
    if (cached) {
        return cached;
    }
    const { ast: transformedAst, diagnostics, suppressions, cacheDependencies, } = await transform_1.default(req);
    const formatted = js_formatter_1.formatJS(transformedAst, {
        typeAnnotations: false,
        indent: req.stage === 'compileForBundle' ? 1 : 0,
        sourceMaps: true,
        sourceText,
    });
    if (req.inputSourceMap !== undefined) {
        const inputSourceMap = codec_source_map_1.SourceMapConsumer.fromJSON(req.inputSourceMap);
        const mappings = [];
        for (const mapping of formatted.mappings) {
            const actual = inputSourceMap.exactOriginalPositionFor(mapping.original.line, mapping.original.column);
            if (actual !== undefined) {
                if (mapping.original.line !== actual.line ||
                    mapping.original.column !== actual.column) {
                    mappings.push({
                        ...mapping,
                        original: {
                            line: actual.line,
                            column: actual.column,
                        },
                    });
                }
                else {
                    mappings.push(mapping);
                }
            }
        }
        formatted.mappings = mappings;
    }
    const res = {
        compiledCode: formatted.code,
        mappings: formatted.mappings,
        diagnostics: [...ast.diagnostics, ...diagnostics],
        cacheDependencies,
        suppressions,
        sourceText,
    };
    compileCache.set(query, res);
    return res;
}
exports.default = compile;
