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
const LSPServer_1 = require("../lsp/LSPServer");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    description: 'TODO',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { master, bridge } = req;
        const lspServer = new LSPServer_1.default(req);
        master.connectedLSPServers.add(lspServer);
        bridge.endEvent.subscribe(() => {
            master.connectedLSPServers.delete(lspServer);
        });
        bridge.lspFromClientBuffer.subscribe((chunk) => {
            lspServer.append(chunk);
        });
        await bridge.endEvent.wait();
    },
});
