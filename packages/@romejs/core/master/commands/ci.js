"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
const lint_1 = require("./lint");
const test_1 = require("./test");
async function runChildCommand(req, fn) {
    try {
        await fn();
    }
    catch (err) {
        if (err instanceof cli_diagnostics_1.DiagnosticsPrinter) {
            // If the command raises diagnostics, it is safe to throw the printer.
            // By doing so, the `ci` command bails and is marked as failed.
            if (err.hasDiagnostics()) {
                throw err;
            }
            else {
                req.master.handleRequestError(req, err);
            }
        }
        else {
            throw err;
        }
    }
}
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.CODE_QUALITY,
    description: 'run lint and tests',
    usage: '',
    examples: [],
    defineFlags(consumer) {
        return {
            fix: consumer.get('fix').asBoolean(false),
        };
    },
    async callback(req, flags) {
        const { reporter } = req;
        reporter.heading('Running lint');
        await runChildCommand(req, async () => {
            await lint_1.default.callback(req, {
                formatOnly: false,
                decisions: [],
                save: flags.fix,
                changed: undefined,
            });
        });
        reporter.heading('Running tests');
        await runChildCommand(req, async () => {
            await test_1.default.callback(req, {
                focusAllowed: false,
                coverage: false,
                freezeSnapshots: !flags.fix,
                updateSnapshots: flags.fix,
                showAllCoverage: false,
                syncTests: false,
            });
        });
    },
});
