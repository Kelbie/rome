"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@romejs/core");
const child = require("child_process");
function fork(processType, opts = {}, args = []) {
    return child.fork(core_1.BIN.join(), args, {
        stdio: 'inherit',
        execArgv: core_1.CHILD_ARGS,
        ...opts,
        env: {
            ...process.env,
            ROME_PROCESS_VERSION: core_1.VERSION,
            ROME_PROCESS_TYPE: processType,
        },
    });
}
exports.default = fork;
