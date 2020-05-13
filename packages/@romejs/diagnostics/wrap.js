"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const derive_1 = require("./derive");
const errors_1 = require("./errors");
async function catchDiagnostics(promise, origin) {
    try {
        const value = await promise();
        return { value, diagnostics: undefined };
    }
    catch (err) {
        const diagnostics = errors_1.getDiagnosticsFromError(err);
        if (diagnostics) {
            return {
                value: undefined,
                diagnostics: origin === undefined
                    ? diagnostics
                    : derive_1.addOriginsToDiagnostics([origin], diagnostics),
            };
        }
        else {
            throw err;
        }
    }
}
exports.catchDiagnostics = catchDiagnostics;
function catchDiagnosticsSync(callback, origin) {
    try {
        const value = callback();
        return { value, diagnostics: undefined };
    }
    catch (err) {
        const diagnostics = errors_1.getDiagnosticsFromError(err);
        if (diagnostics) {
            return {
                value: undefined,
                diagnostics: origin === undefined
                    ? diagnostics
                    : derive_1.addOriginsToDiagnostics([origin], diagnostics),
            };
        }
        else {
            throw err;
        }
    }
}
exports.catchDiagnosticsSync = catchDiagnosticsSync;
