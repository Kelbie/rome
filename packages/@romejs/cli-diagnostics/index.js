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
const cli_reporter_1 = require("@romejs/cli-reporter");
const DiagnosticsPrinter_1 = require("./DiagnosticsPrinter");
exports.DiagnosticsPrinter = DiagnosticsPrinter_1.default;
var utils_1 = require("./utils");
exports.toLines = utils_1.toLines;
var DiagnosticsPrinter_2 = require("./DiagnosticsPrinter");
exports.DEFAULT_PRINTER_FLAGS = DiagnosticsPrinter_2.DEFAULT_PRINTER_FLAGS;
exports.readDiagnosticsFileLocal = DiagnosticsPrinter_2.readDiagnosticsFileLocal;
__export(require("./constants"));
function printDiagnostics({ diagnostics, suppressions, printerOptions, excludeFooter, }) {
    const printer = new DiagnosticsPrinter_1.default(printerOptions);
    printer.processor.addDiagnostics(diagnostics);
    printer.processor.addSuppressions(suppressions);
    printer.print();
    if (!excludeFooter) {
        printer.footer();
    }
    return printer;
}
exports.printDiagnostics = printDiagnostics;
function printDiagnosticsToString(opts) {
    const reporter = new cli_reporter_1.Reporter();
    const stream = reporter.attachCaptureStream(opts.format);
    printDiagnostics({
        ...opts,
        printerOptions: {
            reporter,
            ...opts.printerOptions,
        },
    });
    return stream.read();
}
exports.printDiagnosticsToString = printDiagnosticsToString;
