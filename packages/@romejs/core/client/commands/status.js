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
    description: 'get the current daemon status',
    category: commands_1.commandCategories.PROCESS_MANAGEMENT,
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { reporter } = req.client;
        const bridge = await req.client.tryConnectToExistingDaemon();
        if (bridge) {
            const status = await req.client.query({
                commandName: 'status',
            }, 'master');
            if (status.type === 'SUCCESS') {
                reporter.inspect(status.data);
                return true;
            }
            else {
                return false;
            }
        }
        else {
            reporter.error('Server not running.');
            return false;
        }
    },
});
