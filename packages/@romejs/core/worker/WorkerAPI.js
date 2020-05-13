"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const js_compiler_1 = require("@romejs/js-compiler");
const jsAnalysis = require("@romejs/js-analysis");
const fileHandlers_1 = require("../common/fileHandlers");
const analyzeDependencies_1 = require("../common/types/analyzeDependencies");
const js_formatter_1 = require("@romejs/js-formatter");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
// Some Windows git repos will automatically convert Unix line endings to Windows
// This retains the line endings for the formatted code if they were present in the source
function normalizeFormattedLineEndings(sourceText, formatted) {
    if (sourceText.includes('\r')) {
        return formatted.replace(/\n/g, '\r\n');
    }
    else {
        return formatted;
    }
}
class WorkerAPI {
    constructor(worker) {
        this.worker = worker;
        this.logger = worker.logger;
    }
    interceptAndAddGeneratedToDiagnostics(val, generated) {
        if (generated) {
            const diagnostics = val.diagnostics.map((diag) => {
                return {
                    ...diag,
                    metadata: {
                        ...diag.description,
                        advice: [
                            ...diag.description.advice,
                            {
                                type: 'log',
                                category: 'warn',
                                text: 'This diagnostic was generated on a file that has been converted to JavaScript. The source locations are most likely incorrect',
                            },
                        ],
                    },
                };
            });
            return { ...val, diagnostics };
        }
        else {
            return val;
        }
    }
    async moduleSignatureJS(ref, parseOptions) {
        const { ast, project } = await this.worker.parseJS(ref, parseOptions);
        this.logger.info(`Generating export types:`, ref.real);
        return await jsAnalysis.getModuleSignature({
            ast,
            project,
            provider: await this.worker.getTypeCheckProvider(ref.project, {}, parseOptions),
        });
    }
    async updateInlineSnapshots(ref, updates, parseOptions) {
        let { ast, sourceText } = await this.worker.parseJS(ref, parseOptions);
        const appliedUpdatesToCallees = new Set();
        const pendingUpdates = new Set(updates);
        const context = new js_compiler_1.CompilerContext({
            ast,
            ref,
        });
        ast = context.reduceRoot(ast, {
            name: 'updateInlineSnapshots',
            enter(path) {
                const { node } = path;
                if (node.type !== 'CallExpression' || pendingUpdates.size === 0) {
                    return node;
                }
                let matchedUpdate;
                const { callee } = node;
                for (const { node } of js_ast_utils_1.getNodeReferenceParts(callee).parts) {
                    const { loc } = node;
                    if (loc === undefined) {
                        continue;
                    }
                    for (const update of pendingUpdates) {
                        if (loc.start.column === update.column &&
                            loc.start.line === update.line) {
                            matchedUpdate = update;
                            break;
                        }
                    }
                    if (matchedUpdate !== undefined) {
                        break;
                    }
                }
                if (matchedUpdate !== undefined) {
                    if (appliedUpdatesToCallees.has(callee)) {
                        context.addNodeDiagnostic(node, diagnostics_1.descriptions.SNAPSHOTS.INLINE_COLLISION);
                        return node;
                    }
                    pendingUpdates.delete(matchedUpdate);
                    appliedUpdatesToCallees.add(callee);
                    const args = node.arguments;
                    if (args.length < 1) {
                        context.addNodeDiagnostic(node, diagnostics_1.descriptions.SNAPSHOTS.INLINE_MISSING_RECEIVED);
                        return node;
                    }
                    return {
                        ...node,
                        arguments: [args[0], js_ast_utils_1.valueToNode(matchedUpdate.snapshot)],
                    };
                }
                return node;
            },
        });
        const diags = context.diagnostics.getDiagnostics();
        if (pendingUpdates.size > 0 && diags.length === 0) {
            throw new Error('Left over inline snapshots that were not updated');
        }
        if (diags.length === 0) {
            const formatted = js_formatter_1.formatJS(ast, { sourceText }).code;
            await this.worker.writeFile(ref.real, formatted);
        }
        return diags;
    }
    async analyzeDependencies(ref, parseOptions) {
        const project = this.worker.getProject(ref.project);
        const { handler } = fileHandlers_1.getFileHandlerAssert(ref.real, project.config);
        this.logger.info(`Analyze dependencies:`, ref.real);
        const { analyzeDependencies } = handler;
        if (analyzeDependencies === undefined) {
            return analyzeDependencies_1.UNKNOWN_ANALYZE_DEPENDENCIES_RESULT;
        }
        return await analyzeDependencies({
            file: ref,
            project,
            worker: this.worker,
            parseOptions,
        });
    }
    async workerCompilerOptionsToCompilerOptions(ref, workerOptions, parseOptions) {
        const { bundle, ...options } = workerOptions;
        if (bundle === undefined) {
            return options;
        }
        else {
            return {
                ...options,
                bundle: {
                    ...bundle,
                    analyze: await this.analyzeDependencies(ref, parseOptions),
                },
            };
        }
    }
    async compileJS(ref, stage, options, parseOptions) {
        const { ast, project, sourceText, generated } = await this.worker.parseJS(ref, parseOptions);
        this.logger.info(`Compiling:`, ref.real);
        const compilerOptions = await this.workerCompilerOptionsToCompilerOptions(ref, options, parseOptions);
        return this.interceptAndAddGeneratedToDiagnostics(await js_compiler_1.compile({
            ref,
            ast,
            sourceText,
            options: compilerOptions,
            project,
            stage,
        }), generated);
    }
    async parseJS(ref, opts) {
        let { ast, generated } = await this.worker.parseJS(ref, {
            ...opts,
            sourceType: opts.sourceType,
            cache: false,
        });
        return this.interceptAndAddGeneratedToDiagnostics(ast, generated);
    }
    async format(ref, opts) {
        const res = await this._format(ref, opts);
        if (res === undefined) {
            return undefined;
        }
        else {
            return {
                formatted: normalizeFormattedLineEndings(res.sourceText, res.formatted),
                original: res.sourceText,
                diagnostics: res.diagnostics,
            };
        }
    }
    async _format(ref, parseOptions) {
        const project = this.worker.getProject(ref.project);
        this.logger.info(`Formatting:`, ref.real);
        const { handler } = fileHandlers_1.getFileHandlerAssert(ref.real, project.config);
        const { format } = handler;
        if (format === undefined) {
            return;
        }
        const res = await format({
            file: ref,
            project,
            worker: this.worker,
            parseOptions,
        });
        return res;
    }
    async lint(ref, options, parseOptions) {
        const project = this.worker.getProject(ref.project);
        this.logger.info(`Linting:`, ref.real);
        // Get the extension handler
        const { handler } = fileHandlers_1.getFileHandlerAssert(ref.real, project.config);
        const { lint } = handler;
        if (lint === undefined && handler.format === undefined) {
            return {
                saved: false,
                diagnostics: [],
                suppressions: [],
            };
        }
        // Catch any diagnostics, in the case of syntax errors etc
        const res = await diagnostics_1.catchDiagnostics(() => {
            if (lint === undefined) {
                return this._format(ref, parseOptions);
            }
            else {
                return lint({
                    file: ref,
                    project,
                    worker: this.worker,
                    options,
                    parseOptions,
                });
            }
        }, {
            category: 'lint',
            message: 'Caught by WorkerAPI.lint',
        });
        // These are fatal diagnostics
        if (res.diagnostics !== undefined) {
            return {
                saved: false,
                suppressions: [],
                diagnostics: res.diagnostics,
            };
        }
        // `format` could have return undefined
        if (res.value === undefined) {
            return {
                saved: false,
                diagnostics: [],
                suppressions: [],
            };
        }
        // These are normal diagnostics returned from the linter
        const { sourceText, diagnostics, suppressions, } = res.value;
        const formatted = normalizeFormattedLineEndings(sourceText, res.value.formatted);
        // If the file has pending fixes
        const needsSave = formatted !== sourceText;
        // Autofix if necessary
        if (options.save && needsSave) {
            // Save the file and evict it from the cache
            await this.worker.writeFile(ref.real, formatted);
            // Relint this file without fixing it, we do this to prevent false positive error messages
            return {
                ...(await this.lint(ref, { ...options, save: false }, parseOptions)),
                saved: true,
            };
        }
        // If there's no pending fix then no need for diagnostics
        if (!needsSave) {
            return {
                saved: false,
                diagnostics,
                suppressions,
            };
        }
        // Add pending autofix diagnostic
        return {
            saved: false,
            suppressions,
            diagnostics: [
                ...diagnostics,
                {
                    fixable: true,
                    location: {
                        filename: ref.uid,
                    },
                    description: diagnostics_1.descriptions.LINT.PENDING_FIXES(ref.relative.join(), sourceText, formatted),
                },
            ],
        };
    }
}
exports.default = WorkerAPI;
