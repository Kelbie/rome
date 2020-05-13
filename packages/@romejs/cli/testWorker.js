"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const setProcessTitle_1 = require("./utils/setProcessTitle");
const core_1 = require("@romejs/core");
const cli_flags_1 = require("@romejs/cli-flags");
async function testWorker() {
    setProcessTitle_1.default('test-worker');
    const parser = cli_flags_1.parseCLIFlagsFromProcess({
        programName: 'rome test-worker',
        defineFlags(c) {
            return {
                inspectorPort: c.get('inspectorPort').asNumberFromString(),
            };
        },
    });
    const flags = await parser.init();
    const worker = new core_1.TestWorker();
    worker.init(flags);
}
exports.default = testWorker;
