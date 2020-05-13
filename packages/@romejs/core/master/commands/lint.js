"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Linter_1 = require("../linter/Linter");
const string_markup_1 = require("@romejs/string-markup");
const commands_1 = require("../commands");
const js_compiler_1 = require("@romejs/js-compiler");
const commands_2 = require("@romejs/core/common/commands");
exports.default = commands_1.createMasterCommand({
    category: commands_2.commandCategories.CODE_QUALITY,
    description: 'run lint against a set of files',
    allowRequestFlags: ['watch', 'review'],
    usage: '',
    examples: [],
    defineFlags(consumer) {
        return {
            decisions: consumer.get('decisions').asImplicitArray().map((item) => item.asString()),
            save: consumer.get('save').asBoolean(false),
            formatOnly: consumer.get('formatOnly').asBoolean(false),
            changed: consumer.get('changed').asStringOrVoid(),
        };
    },
    async callback(req, flags) {
        const { reporter } = req;
        let lintCompilerOptionsPerFile = {};
        let globalDecisions = [];
        const { decisions } = flags;
        if (decisions !== undefined) {
            ({ lintCompilerOptionsPerFile, globalDecisions } = js_compiler_1.parseDecisionStrings(decisions, req.client.flags.cwd, (description) => {
                throw req.throwDiagnosticFlagError({
                    description,
                    target: { type: 'flag', key: 'decisions' },
                });
            }));
        }
        // Look up arguments manually in vsc if we were passed a changes branch
        let args;
        if (flags.changed !== undefined) {
            // No arguments expected when using this flag
            req.expectArgumentLength(0);
            const client = await req.getVCSClient();
            const target = flags.changed === '' ? client.trunkBranch : flags.changed;
            args = await client.getModifiedFiles(target);
            if (args.length === 0) {
                reporter.warn(`No files changed from <emphasis>${target}</emphasis>`);
            }
            else {
                reporter.info(`Files changed from <emphasis>${target}</emphasis>`);
                reporter.list(args.map((arg) => string_markup_1.markup `<filelink target="${arg}" />`));
                reporter.hr();
            }
        }
        const opts = {
            hasDecisions: flags.decisions.length > 0,
            lintCompilerOptionsPerFile,
            globalDecisions,
            save: flags.save,
            formatOnly: flags.formatOnly,
            args,
        };
        const linter = new Linter_1.default(req, opts);
        await linter.run(req.query.requestFlags.watch);
    },
});
