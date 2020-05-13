"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const Parser_1 = require("./Parser");
exports.FlagParser = Parser_1.ParserInterface;
const cli_reporter_1 = require("@romejs/cli-reporter");
function parseCLIFlags(reporter, args, opts) {
    const parser = new Parser_1.default(reporter, opts, args);
    return parser.getInterface();
}
exports.parseCLIFlags = parseCLIFlags;
function parseCLIFlagsFromProcess(opts) {
    return parseCLIFlags(cli_reporter_1.Reporter.fromProcess(), process.argv.slice(2), {
        ...opts,
        programName: opts.programName === undefined
            ? process.argv[1]
            : opts.programName,
    });
}
exports.parseCLIFlagsFromProcess = parseCLIFlagsFromProcess;
__export(require("./serializeCLIFlags"));
