"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
exports.default = commands_2.createLocalCommand({
    description: 'connect to an lsp',
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    usage: '',
    examples: [],
    // vscode-languageclient adds these on
    ignoreFlags: ['stdio', 'clientProcessId'],
    defineFlags() {
        return {};
    },
    async callback(req) {
        req.client.setFlags({
            clientName: 'lsp',
            silent: true,
        });
        const stdin = req.client.reporter.getStdin();
        req.client.reporter.teardown();
        const bridge = await req.client.findOrStartMaster();
        if (bridge === undefined) {
            return false;
        }
        bridge.lspFromServerBuffer.subscribe((chunk) => {
            req.client.derivedReporterStreams.stdout.write(chunk);
        });
        stdin.on('data', (chunk) => {
            bridge.lspFromClientBuffer.call(chunk.toString());
        });
        await req.client.query({
            commandName: 'lsp',
        }, 'master');
        return true;
    },
});
