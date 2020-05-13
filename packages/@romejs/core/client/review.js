"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
const diagnostics_1 = require("@romejs/diagnostics");
const MasterRequest_1 = require("../master/MasterRequest");
async function check(req, state) {
    const { reporter } = req.client;
    reporter.clearScreen();
    if (state.initial) {
        reporter.info('Fetching initial diagnostics');
        state.initial = false;
    }
    else {
        reporter.info('Updating diagnostics');
    }
    const res = await req.fork({
        ...req.query,
        // We want data no matter what
        noData: false,
    }).initCommand();
    if (res.type === 'SUCCESS') {
        throw new Error('Expected diagnostics or an error');
    }
    // In case it returned an error
    if (res.type !== 'DIAGNOSTICS') {
        return res;
    }
    const diagnostics = res.diagnostics;
    let diag;
    for (const _diag of diagnostics) {
        const key = diagnostics_1.derivePositionlessKeyFromDiagnostic(_diag);
        if (!state.seen.has(key)) {
            state.seen.add(key);
            diag = _diag;
            break;
        }
    }
    if (diag === undefined) {
        return res;
    }
    return await ask(diag, req, state, false);
}
async function ask(diag, req, state, showMoreOptions) {
    const { client } = req;
    const { reporter } = client;
    reporter.clearScreen();
    // Extract actions and remove them from the diagnostic
    let { advice = [] } = diag.description;
    let hasExtraOptions = false;
    const actions = [];
    for (const item of advice) {
        if (item.type === 'action') {
            // Only show extra items and hide all non-extra items when `more === true`
            if (item.extra === true) {
                hasExtraOptions = true;
                if (!showMoreOptions) {
                    continue;
                }
            }
            else if (showMoreOptions) {
                continue;
            }
            actions.push(item);
        }
    }
    advice = advice.filter((item) => item.type !== 'action');
    diag = {
        ...diag,
        description: {
            ...diag.description,
            advice,
        },
    };
    const optionToAction = new Map();
    const chosenShortcuts = new Set(['n', 'escape']);
    const actionOptions = {};
    let counter = 0;
    for (const action of actions) {
        const key = String(counter++);
        let shortcut = action.shortcut !== undefined && !chosenShortcuts.has(action.shortcut)
            ? action.shortcut
            : undefined;
        optionToAction.set(key, action);
        actionOptions[key] = {
            label: action.noun,
            shortcut,
        };
    }
    const options = {
        ignore: {
            label: 'Do nothing',
            shortcut: 'n',
        },
        ...actionOptions,
        exit: {
            label: 'Exit',
            shortcut: 'escape',
        },
    };
    if (hasExtraOptions) {
        if (showMoreOptions) {
            options.more = {
                label: 'Less options...',
                shortcut: 'l',
            };
        }
        else {
            options.more = {
                label: 'More options...',
                shortcut: 'm',
            };
        }
    }
    const printer = new cli_diagnostics_1.DiagnosticsPrinter({
        reporter,
    });
    diag = printer.processor.addDiagnosticAssert(diag);
    printer.print();
    const answer = await reporter.radio('How do you want to resolve this?', {
        options,
    });
    // Check if this diagnostic is now out of date
    printer.fetchFileSources([diag]);
    const outdatedFiles = printer.getOutdatedFiles(diag);
    if (outdatedFiles.size > 0) {
        const files = Array.from(outdatedFiles, (path) => `<filelink emphasis target="${path.join()}" />`);
        reporter.br();
        if (files.length === 1) {
            reporter.warn(`The file ${files[0]} changed while waiting for your response.`);
        }
        else {
            reporter.warn('The following diagnostic dependencies changed while waiting for your response.');
            reporter.list(files);
        }
        await reporter.confirm('Press any key to try again');
        return await check(req, state);
    }
    if (answer === 'less') {
        return await ask(diag, req, state, false);
    }
    if (answer === 'more') {
        return await ask(diag, req, state, true);
    }
    if (answer === 'ignore') {
        return await check(req, state);
    }
    if (answer === 'exit') {
        return MasterRequest_1.EMPTY_SUCCESS_RESPONSE;
    }
    const action = optionToAction.get(answer);
    if (action === undefined) {
        throw new Error('Should have found an action for this option');
    }
    const requestFlags = {
        ...action.requestFlags,
    };
    // Execute action
    const actionRes = await client.query({
        commandName: action.command,
        args: action.args,
        commandFlags: action.commandFlags,
        requestFlags,
    }, 'master');
    if (actionRes.type !== 'DIAGNOSTICS' && actionRes.type !== 'SUCCESS') {
        return actionRes;
    }
    state.resolvedCount++;
    return await check(req, state);
}
async function review(req) {
    const { reporter } = req.client;
    const state = {
        initial: true,
        seen: new Set(),
        resolvedCount: 0,
    };
    const res = await check(req, state);
    reporter.clearScreen();
    if (state.seen.size === 0) {
        reporter.success('Nothing to review!');
    }
    else {
        if (res.type === 'DIAGNOSTICS') {
            cli_diagnostics_1.printDiagnostics({
                diagnostics: res.diagnostics,
                suppressions: [],
                excludeFooter: true,
                printerOptions: {
                    reporter,
                },
            });
            reporter.hr();
            reporter.error(`<number emphasis>${res.diagnostics.length}</number> unresolved <grammarNumber plural="issues" singular="issue">${res.diagnostics.length}</grammarNumber> remaining`);
        }
        reporter.success(`<number emphasis>${state.resolvedCount}</number> <grammarNumber plural="issues" singular="issue">${state.resolvedCount}</grammarNumber> resolved`);
    }
    return res;
}
exports.default = review;
