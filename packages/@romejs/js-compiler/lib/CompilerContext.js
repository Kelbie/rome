"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const parser_core_1 = require("@romejs/parser-core");
const diagnostics_1 = require("@romejs/diagnostics");
const Scope_1 = require("../scope/Scope");
const reduce_1 = require("../methods/reduce");
const path_1 = require("@romejs/path");
const suppressions_1 = require("../suppressions");
const CommentsConsumer_1 = require("@romejs/js-parser/CommentsConsumer");
const ob1_1 = require("@romejs/ob1");
const transforms_1 = require("../transforms");
const string_diff_1 = require("@romejs/string-diff");
const js_formatter_1 = require("@romejs/js-formatter");
const constants_1 = require("../constants");
const project_1 = require("@romejs/project");
const decisions_1 = require("../lint/decisions");
function getFormattedCodeFromExitResult(result) {
    if (Array.isArray(result)) {
        // TODO?
        return '';
    }
    else if (result === constants_1.REDUCE_REMOVE) {
        return '';
    }
    else {
        return js_formatter_1.formatJS(result).code;
    }
}
class CompilerContext {
    constructor(arg) {
        const { ast, origin, ref, frozen = false, options = {}, sourceText = '', project = {
            folder: undefined,
            config: project_1.DEFAULT_PROJECT_CONFIG,
        }, suppressions, } = arg;
        this.records = [];
        this.path = path_1.createUnknownFilePath(ast.filename);
        this.filename = ast.filename;
        this.sourceText = sourceText;
        this.displayFilename =
            ref === undefined ? ast.filename : ref.relative.join();
        this.frozen = frozen;
        this.mtime = ast.mtime;
        this.project = project;
        this.options = options;
        this.origin = origin;
        this.cacheDependencies = new Set();
        this.sourceType = ast.sourceType;
        this.rootScope = new Scope_1.RootScope(this, ast);
        this.comments = new CommentsConsumer_1.default(ast.comments);
        this.diagnostics = new diagnostics_1.DiagnosticsProcessor();
        if (suppressions === undefined) {
            const { suppressions, diagnostics } = suppressions_1.extractSuppressionsFromProgram(this, ast);
            this.suppressions = suppressions;
            this.diagnostics.addDiagnostics(diagnostics);
        }
        else {
            this.suppressions = suppressions;
        }
    }
    async normalizeTransforms(transforms) {
        return Promise.all(transforms.map(async (visitor) => {
            if (typeof visitor === 'function') {
                return await visitor(this);
            }
            else {
                return visitor;
            }
        }));
    }
    getComments(ids) {
        return this.comments.getCommentsFromIds(ids);
    }
    hasLocSuppression(loc, category) {
        if (loc === undefined) {
            return false;
        }
        for (const suppression of this.suppressions) {
            if (suppression.category === category &&
                suppressions_1.matchesSuppression(loc, suppression)) {
                return true;
            }
        }
        return false;
    }
    getRootScope() {
        const { rootScope } = this;
        if (rootScope === undefined) {
            throw new Error('Expected root scope');
        }
        return rootScope;
    }
    getCacheDependencies() {
        return Array.from(this.cacheDependencies);
    }
    addCacheDependency(filename) {
        this.cacheDependencies.add(filename);
    }
    reduceRoot(ast, visitors, pathOpts) {
        return js_ast_1.program.assert(reduce_1.default(ast, [...transforms_1.hookVisitors, ...(Array.isArray(visitors) ? visitors : [visitors])], this, pathOpts));
    }
    reduce(ast, visitors, pathOpts) {
        return reduce_1.default(ast, Array.isArray(visitors) ? visitors : [visitors], this, pathOpts);
    }
    record(record) {
        this.records.push(record);
    }
    hasLintDecisions() {
        const { lint } = this.options;
        return lint !== undefined && lint.hasDecisions === true;
    }
    getLintDecisions(key) {
        const { lint } = this.options;
        if (lint === undefined) {
            return [];
        }
        const { globalDecisions = [] } = lint;
        if (key === undefined) {
            return globalDecisions;
        }
        const { decisionsByPosition } = lint;
        if (decisionsByPosition === undefined) {
            return globalDecisions;
        }
        return [...globalDecisions, ...(decisionsByPosition[key] || [])];
    }
    addFixableDiagnostic(nodes, description, diag = {}) {
        const { old, fixed: defaultFixed, suggestions } = nodes;
        const target = nodes.target === undefined ? nodes.old : nodes.target;
        const { category } = description;
        const advice = [...description.advice];
        const loc = this.getLoc(target);
        const oldCode = loc === undefined
            ? ''
            : this.sourceText.slice(ob1_1.ob1Get0(loc.start.index), ob1_1.ob1Get0(loc.end.index));
        let fixed = defaultFixed;
        // Add recommended fix
        if (defaultFixed !== undefined) {
            advice.push({
                type: 'log',
                category: 'info',
                text: 'Recommended fix',
            });
            advice.push({
                type: 'diff',
                diff: string_diff_1.default(oldCode, getFormattedCodeFromExitResult(defaultFixed)),
            });
            if (loc === undefined) {
                advice.push({
                    type: 'log',
                    category: 'error',
                    text: 'Unable to find target location',
                });
            }
            else {
                advice.push(decisions_1.buildLintDecisionAdviceAction({
                    filename: this.displayFilename,
                    decision: decisions_1.buildLintDecisionString({
                        action: 'fix',
                        filename: this.displayFilename,
                        category,
                        start: loc.start,
                    }),
                    shortcut: 'f',
                    noun: 'Apply fix',
                    instruction: 'To apply this fix run',
                }));
                advice.push(decisions_1.buildLintDecisionAdviceAction({
                    extra: true,
                    noun: 'Apply fix for ALL files with this category',
                    instruction: 'To apply fix for ALL files with this category run',
                    decision: decisions_1.buildLintDecisionGlobalString('fix', category),
                }));
            }
        }
        if (suggestions !== undefined) {
            // If we have lint decisions then find the fix that corresponds with this suggestion
            if (this.hasLintDecisions()) {
                const decisions = this.getLintDecisions(decisions_1.deriveDecisionPositionKey('fix', loc));
                for (const decision of decisions) {
                    if (decision.category === category &&
                        decision.action === 'fix' &&
                        decision.id !== undefined) {
                        const suggestion = suggestions[decision.id];
                        if (suggestion !== undefined) {
                            fixed = suggestion.fixed;
                        }
                    }
                }
            }
            // Add advice suggestions
            let index = 0;
            for (const suggestion of suggestions) {
                const num = index + 1;
                const titlePrefix = suggestions.length === 1 ? 'Suggested fix' : `Suggested fix #${num}`;
                advice.push({
                    type: 'log',
                    category: 'none',
                    text: `<emphasis>${titlePrefix}:</emphasis> ${suggestion.title}`,
                });
                advice.push({
                    type: 'diff',
                    diff: string_diff_1.default(oldCode, getFormattedCodeFromExitResult(suggestion.fixed)),
                });
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: suggestion.description,
                });
                if (loc === undefined) {
                    advice.push({
                        type: 'log',
                        category: 'error',
                        text: 'Unable to find target location',
                    });
                }
                else {
                    advice.push(decisions_1.buildLintDecisionAdviceAction({
                        noun: suggestions.length === 1
                            ? 'Apply suggested fix'
                            : `Apply suggested fix "${suggestion.title}"`,
                        shortcut: String(num),
                        instruction: 'To apply this fix run',
                        filename: this.displayFilename,
                        decision: decisions_1.buildLintDecisionString({
                            filename: this.displayFilename,
                            action: 'fix',
                            category,
                            start: loc.start,
                            id: index,
                        }),
                    }));
                }
                index++;
            }
        }
        const { suppressed } = this.addLocDiagnostic(loc, {
            ...description,
            advice,
        }, {
            ...diag,
            fixable: true,
        });
        if (suppressed || fixed === undefined) {
            return old;
        }
        return fixed;
    }
    addLocDiagnostic(loc, description, contextDiag = {}) {
        let origins = [];
        if (this.origin !== undefined) {
            origins.push(this.origin);
        }
        if (contextDiag.origins !== undefined) {
            origins = origins.concat(contextDiag.origins);
        }
        if (loc !== undefined && loc.filename !== this.filename) {
            throw new Error(`Trying to add a location from ${loc.filename} on a Context from ${this.path}`);
        }
        const { category, advice = [] } = description;
        if (loc !== undefined && loc.start !== undefined) {
            advice.push(decisions_1.buildLintDecisionAdviceAction({
                noun: 'Add suppression comment',
                shortcut: 's',
                instruction: 'To suppress this error run',
                filename: this.displayFilename,
                decision: decisions_1.buildLintDecisionString({
                    filename: this.displayFilename,
                    action: 'suppress',
                    category,
                    start: loc.start,
                }),
            }));
            advice.push(decisions_1.buildLintDecisionAdviceAction({
                extra: true,
                noun: 'Add suppression comments for ALL files with this category',
                instruction: 'To add suppression comments for ALL files with this category run',
                decision: decisions_1.buildLintDecisionGlobalString('suppress', category),
            }));
        }
        const { marker, ...diag } = contextDiag;
        const diagnostic = this.diagnostics.addDiagnostic({
            ...diag,
            description: {
                ...description,
                advice,
            },
            location: {
                marker,
                mtime: this.mtime,
                filename: this.filename,
                start: loc === undefined ? undefined : loc.start,
                end: loc === undefined ? undefined : loc.end,
                language: 'js',
                sourceType: this.sourceType,
            },
            origins,
        });
        let suppressed = this.hasLocSuppression(loc, description.category);
        // If we've been passed lint decisions then consider it suppressed unless we have been specifically told to fix it
        const diagCategory = description.category;
        if (this.hasLintDecisions()) {
            suppressed = true;
            const decisions = this.getLintDecisions(decisions_1.deriveDecisionPositionKey('fix', loc));
            for (const { category, action } of decisions) {
                if (category === diagCategory && action === 'fix') {
                    suppressed = false;
                }
            }
        }
        return {
            loc,
            diagnostic,
            suppressed,
        };
    }
    getLoc(node) {
        if (node === undefined) {
            return undefined;
        }
        if (Array.isArray(node)) {
            return parser_core_1.extractSourceLocationRangeFromNodes(node);
        }
        else {
            return node.loc;
        }
    }
    addNodeDiagnostic(node, description, diag = {}) {
        return this.addLocDiagnostic(this.getLoc(node), description, diag);
    }
}
exports.default = CompilerContext;
