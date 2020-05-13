"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../web/index");
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
const DEFAULT_PORT = 8081;
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.SOURCE_CODE,
    description: 'start a web server',
    usage: '',
    examples: [],
    defineFlags(c) {
        return {
            port: c.get('port').asNumber(DEFAULT_PORT),
        };
    },
    async callback(req, flags) {
        // Initialize cwd early since we'll need it for any requests
        await req.master.projectManager.findProject(req.client.flags.cwd);
        const web = new index_1.WebServer(req);
        web.listen(flags.port);
        req.endEvent.subscribe(() => {
            web.close();
        });
        await new Promise(() => { });
    },
});
