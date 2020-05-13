"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
const string_utils_1 = require("@romejs/string-utils");
function validateAction(raw, unexpected) {
    if (raw === 'fix' || raw === 'suppress' || raw === 'ignore') {
        return raw;
    }
    else {
        unexpected(diagnostics_1.descriptions.LINT_COMMAND.INVALID_DECISION_ACTION(raw));
        return undefined;
    }
}
function deriveDecisionPositionKey(action, loc) {
    if (loc === undefined) {
        return undefined;
    }
    const { start } = loc;
    if (start === undefined) {
        return undefined;
    }
    if (action === 'suppress') {
        return `${ob1_1.ob1Get1(start.line)}`;
    }
    else {
        return `${ob1_1.ob1Get1(start.line)}:${ob1_1.ob1Get0(start.column)}`;
    }
}
exports.deriveDecisionPositionKey = deriveDecisionPositionKey;
function parseDecisionStrings(decisions, cwd, unexpected) {
    const lintCompilerOptionsPerFile = {};
    const globalDecisions = [];
    function parseGlobalDecision(parts, i) {
        if (parts.length !== 2) {
            unexpected(diagnostics_1.descriptions.LINT_COMMAND.INVALID_DECISION_PART_COUNT(i));
        }
        const [rawAction, rawCategory] = parts;
        const action = validateAction(rawAction, unexpected);
        if (action === undefined) {
            return;
        }
        const category = rawCategory;
        globalDecisions.push({ category, action });
    }
    function parseLineDecision(parts, i) {
        if (parts.length < 4 || parts.length > 5) {
            unexpected(diagnostics_1.descriptions.LINT_COMMAND.INVALID_DECISION_PART_COUNT(i));
        }
        const [rawAction, rawCategory, rawFilename, pos, id] = parts;
        const action = validateAction(rawAction, unexpected);
        if (action === undefined) {
            return;
        }
        const category = rawCategory;
        const resolvedFilename = cwd.resolve(rawFilename).join();
        let compilerOptions = lintCompilerOptionsPerFile[resolvedFilename];
        if (compilerOptions === undefined) {
            compilerOptions = {
                hasDecisions: true,
                globalDecisions: [],
                decisionsByPosition: {},
            };
            lintCompilerOptionsPerFile[resolvedFilename] = compilerOptions;
        }
        let decisionsForPosition = compilerOptions.decisionsByPosition[pos];
        if (decisionsForPosition === undefined) {
            decisionsForPosition = [];
            compilerOptions.decisionsByPosition[pos] = decisionsForPosition;
        }
        decisionsForPosition.push({
            action,
            category,
            id: id === undefined ? undefined : Number(id),
        });
    }
    for (let i = 0; i < decisions.length; i++) {
        const segment = decisions[i];
        const parts = string_utils_1.escapeSplit(segment, '-');
        if (parts[0] === 'global') {
            parseGlobalDecision(parts.slice(1), i);
        }
        else {
            parseLineDecision(parts, i);
        }
    }
    return { lintCompilerOptionsPerFile, globalDecisions };
}
exports.parseDecisionStrings = parseDecisionStrings;
function escapeFilename(filename) {
    return filename.replace(/-/, '\\-');
}
function buildLintDecisionGlobalString(action, category) {
    return `global-${action}-${category}`;
}
exports.buildLintDecisionGlobalString = buildLintDecisionGlobalString;
function buildLintDecisionString({ filename, action, category, start, id, }) {
    const escapedFilename = escapeFilename(filename);
    const pos = deriveDecisionPositionKey(action, { start });
    const parts = [action, category, escapedFilename, pos];
    if (id !== undefined) {
        parts.push(String(id));
    }
    return parts.join('-');
}
exports.buildLintDecisionString = buildLintDecisionString;
function buildLintDecisionAdviceAction({ noun, instruction, filename, shortcut, decision, extra, }) {
    return {
        type: 'action',
        extra,
        hidden: true,
        command: 'lint',
        shortcut,
        args: filename === undefined ? [] : [escapeFilename(filename)],
        noun,
        instruction,
        commandFlags: {
            decisions: [decision],
        },
    };
}
exports.buildLintDecisionAdviceAction = buildLintDecisionAdviceAction;
