"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const run_1 = require("./commands/run");
const publish_1 = require("./commands/publish");
const status_1 = require("./commands/status");
const stop_1 = require("./commands/stop");
const develop_1 = require("./commands/develop");
const config_1 = require("./commands/config");
const compile_1 = require("./commands/compile");
const resolve_1 = require("./commands/resolve");
const analyzeDependencies_1 = require("./commands/analyzeDependencies");
const parse_1 = require("./commands/parse");
const bundle_1 = require("./commands/bundle");
const format_1 = require("./commands/format");
const lsp_1 = require("./commands/lsp");
const lint_1 = require("./commands/lint");
const ci_1 = require("./commands/ci");
const test_1 = require("./commands/test");
// Hidden commands, useful for internal debugging but not much else
const _evict_1 = require("./commands/_evict");
const _moduleSignature_1 = require("./commands/_moduleSignature");
const _noop_1 = require("./commands/_noop");
function createMasterCommand(cmd) {
    return cmd;
}
exports.createMasterCommand = createMasterCommand;
// rome-ignore lint/noExplicitAny
exports.masterCommands = new Map();
exports.masterCommands.set('test', test_1.default);
exports.masterCommands.set('lint', lint_1.default);
exports.masterCommands.set('config', config_1.default);
exports.masterCommands.set('bundle', bundle_1.default);
exports.masterCommands.set('parse', parse_1.default);
exports.masterCommands.set('analyzeDependencies', analyzeDependencies_1.default);
exports.masterCommands.set('resolve', resolve_1.default);
exports.masterCommands.set('compile', compile_1.default);
exports.masterCommands.set('stop', stop_1.default);
exports.masterCommands.set('status', status_1.default);
exports.masterCommands.set('run', run_1.default);
exports.masterCommands.set('publish', publish_1.default);
exports.masterCommands.set('ci', ci_1.default);
exports.masterCommands.set('develop', develop_1.default);
exports.masterCommands.set('format', format_1.default);
exports.masterCommands.set('lsp', lsp_1.default);
exports.masterCommands.set('_evict', _evict_1.default);
exports.masterCommands.set('_moduleSignature', _moduleSignature_1.default);
exports.masterCommands.set('_noop', _noop_1.default);
