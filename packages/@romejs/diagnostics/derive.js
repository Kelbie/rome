"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const v8_1 = require("@romejs/v8");
const descriptions_1 = require("./descriptions");
const DiagnosticsNormalizer_1 = require("./DiagnosticsNormalizer");
const helpers_1 = require("./helpers");
function normalizeArray(val) {
    if (Array.isArray(val)) {
        return val;
    }
    else {
        return [];
    }
}
function mergeDiagnostics(rootDiag, ...diags) {
    let mergedAdvice = [
        ...normalizeArray(rootDiag.description.advice),
    ];
    for (const diag of diags) {
        mergedAdvice = [
            ...mergedAdvice,
            ...deriveRootAdviceFromDiagnostic(diag).advice,
            ...normalizeArray(diag.description.advice),
        ];
    }
    return {
        ...rootDiag,
        description: {
            ...rootDiag.description,
            advice: mergedAdvice,
        },
    };
}
exports.mergeDiagnostics = mergeDiagnostics;
function derivePositionlessKeyFromDiagnostic(diag) {
    const normalizer = new DiagnosticsNormalizer_1.default({
        stripPositions: true,
    });
    return JSON.stringify(normalizer.normalizeDiagnostic(diag));
}
exports.derivePositionlessKeyFromDiagnostic = derivePositionlessKeyFromDiagnostic;
function deriveRootAdviceFromDiagnostic(diag, opts = {
    skipFrame: false,
    includeHeaderInAdvice: true,
    outdated: false,
}) {
    const advice = [];
    const { description, fixable, location } = diag;
    let header = helpers_1.diagnosticLocationToMarkupFilelink(location);
    if (diag.label !== undefined) {
        header += ` <emphasis>${diag.label}</emphasis>`;
        if (description.category !== undefined) {
            header += ` <dim>${description.category}</dim>`;
        }
    }
    else {
        if (description.category !== undefined) {
            header += ` <emphasis>${description.category}</emphasis>`;
        }
    }
    if (fixable === true) {
        header += ` <inverse>FIXABLE</inverse>`;
    }
    if (opts.outdated === true) {
        header += ` <inverse>OUTDATED</inverse>`;
    }
    if (opts.includeHeaderInAdvice === true) {
        advice.push({
            type: 'log',
            category: 'none',
            text: header,
        });
    }
    advice.push({
        type: 'log',
        category: 'error',
        text: description.message.value,
    });
    if (opts.skipFrame === false) {
        if (location.start !== undefined && location.end !== undefined) {
            advice.push({
                type: 'frame',
                location: diag.location,
            });
        }
        else if (location.marker !== undefined) {
            // If we have no start/end, but we do have a marker then output is a log error
            advice.push({
                type: 'log',
                category: 'error',
                text: location.marker,
            });
        }
    }
    return { header, advice };
}
exports.deriveRootAdviceFromDiagnostic = deriveRootAdviceFromDiagnostic;
function deriveDiagnosticFromErrorStructure(struct, opts) {
    const { filename } = opts;
    let targetFilename = filename;
    let targetCode = undefined;
    let targetLoc = undefined;
    let { frames, message = 'Unknown error' } = struct;
    const { cleanFrames } = opts;
    if (cleanFrames !== undefined) {
        frames = cleanFrames(frames);
    }
    // Point the target to the closest frame with a filename
    for (const frame of frames) {
        if (frame.filename === undefined) {
            continue;
        }
        targetFilename = frame.filename;
        targetLoc = v8_1.getSourceLocationFromErrorFrame(frame);
        break;
    }
    const advice = getErrorStackAdvice({
        ...struct,
        frames,
    });
    return {
        description: {
            message: descriptions_1.createBlessedDiagnosticMessage(string_markup_1.escapeMarkup(message)),
            ...opts.description,
            advice: [...advice, ...(opts.description?.advice || [])],
        },
        location: {
            filename: targetFilename,
            start: targetLoc === undefined ? undefined : targetLoc.start,
            end: targetLoc === undefined ? undefined : targetLoc.end,
            sourceText: targetCode,
        },
        label: opts.label,
    };
}
exports.deriveDiagnosticFromErrorStructure = deriveDiagnosticFromErrorStructure;
function deriveDiagnosticFromError(error, opts) {
    return deriveDiagnosticFromErrorStructure(v8_1.getErrorStructure(error), opts);
}
exports.deriveDiagnosticFromError = deriveDiagnosticFromError;
function getErrorStackAdvice(error, title) {
    const advice = [];
    const { frames, stack } = error;
    if (frames.length === 0 && stack !== undefined) {
        // Just in case we didn't get the frames for some reason
        if (title !== undefined) {
            advice.push({
                type: 'log',
                category: 'info',
                text: title,
            });
        }
        // Remove the `message` from the `stack`
        let cleanStack = stack;
        let removeMessage = `${error.name}: ${error.message}`;
        if (cleanStack.startsWith(removeMessage)) {
            cleanStack = cleanStack.slice(removeMessage.length);
        }
        advice.push({
            type: 'log',
            category: 'error',
            text: string_markup_1.escapeMarkup(cleanStack),
        });
    }
    else {
        const adviceFrames = frames.map((frame) => {
            const { typeName, functionName, methodName, filename, lineNumber, columnNumber, isEval, isNative, isConstructor, isAsync, } = frame;
            const prefixes = [];
            if (isAsync) {
                prefixes.push('await');
            }
            if (isEval) {
                prefixes.push('eval');
            }
            if (isConstructor) {
                prefixes.push('new');
            }
            const prefix = prefixes.length === 0 ? undefined : prefixes.join(' ');
            let object = typeName;
            let property = '<anonymous>';
            if (functionName !== undefined) {
                property = functionName;
            }
            if (methodName !== undefined) {
                property = methodName;
            }
            let suffix;
            if (isNative) {
                suffix = 'native';
            }
            return {
                suffix,
                prefix,
                object,
                property,
                filename,
                line: lineNumber,
                column: columnNumber,
            };
        });
        advice.push({
            type: 'stacktrace',
            title,
            frames: adviceFrames,
        });
    }
    return advice;
}
exports.getErrorStackAdvice = getErrorStackAdvice;
function addOriginsToDiagnostics(origins, diagnostics) {
    return diagnostics.map((diag) => {
        return addOriginsToDiagnostic(origins, diag);
    });
}
exports.addOriginsToDiagnostics = addOriginsToDiagnostics;
function addOriginsToDiagnostic(origins, diag) {
    const newOrigins = diag.origins === undefined ? origins : [...origins, ...diag.origins];
    return {
        ...diag,
        origins: newOrigins,
    };
}
exports.addOriginsToDiagnostic = addOriginsToDiagnostic;
