"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
const path_1 = require("@romejs/path");
exports.DEFAULT_CLIENT_FLAGS = {
    clientName: 'unknown',
    cwd: path_1.CWD_PATH,
    silent: false,
    verbose: false,
};
exports.DEFAULT_CLIENT_REQUEST_FLAGS = {
    ...cli_diagnostics_1.DEFAULT_PRINTER_FLAGS,
    showAllDiagnostics: false,
    collectMarkers: false,
    timing: false,
    benchmark: false,
    benchmarkIterations: 10,
    watch: false,
    review: false,
    resolverPlatform: undefined,
    resolverScale: undefined,
    resolverMocks: false,
};
