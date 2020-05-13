"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cli_reporter_1 = require("@romejs/cli-reporter");
class MasterReporter extends cli_reporter_1.Reporter {
    constructor(master) {
        super({
            wrapperFactory: master.wrapFatal.bind(master),
        });
        this.master = master;
    }
    // This is so all progress bars are also shown on an LSP client, alongside connected CLIs
    progress(opts) {
        const progresses = [this.progressLocal(opts)];
        for (const server of this.master.connectedLSPServers) {
            progresses.push(server.createProgress(opts));
        }
        return cli_reporter_1.mergeProgresses(progresses);
    }
}
exports.default = MasterReporter;
