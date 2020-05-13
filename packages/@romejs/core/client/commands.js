"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const init_1 = require("./commands/init");
const start_1 = require("./commands/start");
const develop_1 = require("./commands/develop");
const stop_1 = require("./commands/stop");
const run_1 = require("./commands/run");
const restart_1 = require("./commands/restart");
const status_1 = require("./commands/status");
const lsp_1 = require("./commands/lsp");
function createLocalCommand(cmd) {
    return cmd;
}
exports.createLocalCommand = createLocalCommand;
// rome-ignore lint/noExplicitAny
exports.localCommands = new Map();
exports.localCommands.set('init', init_1.default);
exports.localCommands.set('start', start_1.default);
exports.localCommands.set('develop', develop_1.default);
exports.localCommands.set('stop', stop_1.default);
exports.localCommands.set('run', run_1.default);
exports.localCommands.set('restart', restart_1.default);
exports.localCommands.set('status', status_1.default);
exports.localCommands.set('lsp', lsp_1.default);
