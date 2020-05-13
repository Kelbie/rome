"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
class DiagnosticsError extends Error {
    constructor(message, diagnostics, suppressions = []) {
        if (diagnostics.length === 0) {
            throw new Error('No diagnostics');
        }
        message += '\n';
        message += cli_diagnostics_1.printDiagnosticsToString({ diagnostics, suppressions });
        super(message);
        this.diagnostics = diagnostics;
        this.suppressions = suppressions;
        this.name = 'DiagnosticsError';
    }
}
exports.DiagnosticsError = DiagnosticsError;
function createSingleDiagnosticError(diag, suppressions) {
    return new DiagnosticsError(diag.description.message.value, [diag], suppressions);
}
exports.createSingleDiagnosticError = createSingleDiagnosticError;
function getDiagnosticsFromError(err) {
    if (err instanceof DiagnosticsError) {
        const processor = new diagnostics_1.DiagnosticsProcessor({});
        processor.addSuppressions(err.suppressions);
        processor.addDiagnostics(err.diagnostics);
        return processor.getDiagnostics();
    }
    return undefined;
}
exports.getDiagnosticsFromError = getDiagnosticsFromError;
