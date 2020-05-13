"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const utils_1 = require("./utils");
const buildPatchCodeFrame_1 = require("./buildPatchCodeFrame");
const buildMessageCodeFrame_1 = require("./buildMessageCodeFrame");
const string_markup_1 = require("@romejs/string-markup");
const ob1_1 = require("@romejs/ob1");
const constants_1 = require("./constants");
const string_diff_1 = require("@romejs/string-diff");
const string_utils_1 = require("@romejs/string-utils");
const cli_flags_1 = require("@romejs/cli-flags");
const DID_PRINT = {
    printed: true,
    truncated: false,
};
const DID_NOT_PRINT = {
    printed: false,
    truncated: false,
};
function printAdvice(item, opts) {
    switch (item.type) {
        case 'log':
            return printLog(item, opts);
        case 'action':
            return printAction(item, opts);
        case 'list':
            return printList(item, opts);
        case 'diff':
            return printDiff(item, opts);
        case 'code':
            return printCode(item, opts);
        case 'command':
            return printCommand(item, opts);
        case 'frame':
            return printFrame(item, opts);
        case 'stacktrace':
            return printStacktrace(item, opts);
        case 'inspect':
            return printInspect(item, opts);
    }
}
exports.default = printAdvice;
function printAction(item, opts) {
    if (item.hidden && !opts.printer.flags.verboseDiagnostics) {
        return DID_NOT_PRINT;
    }
    opts.reporter.info(item.instruction);
    const command = cli_flags_1.serializeCLIFlags({
        prefix: '',
        programName: 'rome',
        commandName: item.command,
        args: item.args,
        flags: {
            ...item.commandFlags,
            ...item.requestFlags,
        },
    }, { type: 'none' }).sourceText;
    opts.reporter.command(command);
    return DID_PRINT;
}
function printCommand(item, opts) {
    opts.reporter.command(item.command);
    return DID_PRINT;
}
function printInspect(item, opts) {
    const { reporter } = opts;
    reporter.indent(() => {
        reporter.inspect(item.data);
    });
    return DID_PRINT;
}
function generateDiffHint(diffs) {
    let expected = '';
    let received = '';
    for (const [type, text] of diffs) {
        switch (type) {
            case string_diff_1.diffConstants.ADD: {
                received += text;
                break;
            }
            case string_diff_1.diffConstants.DELETE: {
                expected += text;
                break;
            }
            case string_diff_1.diffConstants.EQUAL: {
                expected += text;
                received += text;
                break;
            }
        }
    }
    if (expected.trim() === received.trim()) {
        return {
            type: 'log',
            category: 'info',
            text: 'Only difference is leading and trailing whitespace',
        };
    }
    const receivedNoCRLF = string_utils_1.removeCarriageReturn(received);
    if (expected === receivedNoCRLF) {
        return {
            type: 'log',
            category: 'info',
            text: 'Identical except the received uses CRLF newlines, while the expected does not',
        };
    }
    const expectedNoCRLF = string_utils_1.removeCarriageReturn(expected);
    if (received === expectedNoCRLF) {
        return {
            type: 'log',
            category: 'info',
            text: 'Identical except the expected uses CRLF newlines, while the received does not',
        };
    }
    return undefined;
}
function printDiff(item, opts) {
    const { frame, truncated } = buildPatchCodeFrame_1.default(item, opts.flags.verboseDiagnostics);
    if (frame === '') {
        return DID_NOT_PRINT;
    }
    opts.reporter.logAll(frame);
    const hint = generateDiffHint(item.diff);
    if (hint !== undefined) {
        opts.reporter.br();
        printAdvice(hint, opts);
        opts.reporter.br();
    }
    return {
        printed: true,
        truncated,
    };
}
function printList(item, opts) {
    if (item.list.length === 0) {
        return DID_NOT_PRINT;
    }
    else {
        const { truncated } = opts.reporter.list(item.list, {
            truncate: opts.flags.verboseDiagnostics ? undefined : 20,
            reverse: item.reverse,
            ordered: item.ordered,
        });
        return {
            printed: true,
            truncated,
        };
    }
}
function printCode(item, opts) {
    const { reporter } = opts;
    const truncated = !opts.flags.verboseDiagnostics && item.code.length > constants_1.RAW_CODE_MAX_LENGTH;
    let code = truncated ? item.code.slice(0, constants_1.RAW_CODE_MAX_LENGTH) : item.code;
    reporter.indent(() => {
        if (code === '') {
            reporter.logAll('<dim>empty input</dim>');
        }
        else {
            // If it's a string with only whitespace then make it obvious
            if (code.trim() === '') {
                code = utils_1.showInvisibles(code);
            }
            reporter.logAll(`<nobr>${string_markup_1.escapeMarkup(code)}</nobr>`);
        }
        if (truncated) {
            reporter.logAll(`<dim><number>${item.code.length - constants_1.RAW_CODE_MAX_LENGTH}</number> more characters truncated</dim>`);
        }
    });
    return {
        printed: true,
        truncated,
    };
}
function printFrame(item, opts) {
    const { reporter } = opts;
    const { marker, start, end, filename } = item.location;
    let { sourceText } = item.location;
    const path = opts.printer.createFilePath(filename);
    let cleanMarker = '';
    if (marker !== undefined) {
        cleanMarker = string_markup_1.markupTag('emphasis', cleanMessage(marker));
    }
    let lines = [];
    if (sourceText !== undefined) {
        lines = utils_1.toLines({
            path,
            input: sourceText,
            sourceType: item.location.sourceType,
            language: item.location.language,
        });
    }
    else if (filename !== undefined) {
        const source = opts.fileSources.get(path);
        if (source !== undefined) {
            lines = source.lines;
            sourceText = source.sourceText;
        }
    }
    else if (path.isAbsolute() &&
        opts.missingFileSources.has(path.assertAbsolute())) {
        lines = ['<dim>File does not exist</dim>'];
    }
    if (sourceText === undefined) {
        sourceText = '';
    }
    const frame = buildMessageCodeFrame_1.default(sourceText, lines, start, end, cleanMarker);
    if (frame.trim() === '') {
        return DID_NOT_PRINT;
    }
    reporter.logAll(frame);
    return DID_PRINT;
}
function printStacktrace(item, opts) {
    const { diagnostic } = opts;
    const { frames } = item;
    let shownCodeFrames = 0;
    const isFirstPart = diagnostic.description.advice[0] === item;
    if (!isFirstPart) {
        const { title } = item;
        if (title !== undefined) {
            opts.reporter.info(string_markup_1.escapeMarkup(title));
            opts.reporter.br(true);
        }
    }
    opts.reporter.processedList(frames, (reporter, frame) => {
        const { filename, object, suffix, property, prefix, line, column, language, sourceText: code, } = frame;
        const logParts = [];
        // Add prefix
        if (prefix !== undefined) {
            logParts.push(string_markup_1.markupTag('dim', string_markup_1.escapeMarkup(prefix)));
        }
        // Build path
        const objParts = [];
        if (object !== undefined) {
            objParts.push(string_markup_1.markupTag('highlight', string_markup_1.escapeMarkup(object), { i: 0 }));
        }
        if (property !== undefined) {
            objParts.push(string_markup_1.markupTag('highlight', string_markup_1.escapeMarkup(property), { i: 1 }));
        }
        if (objParts.length > 0) {
            logParts.push(objParts.join('.'));
        }
        // Add suffix
        if (suffix !== undefined) {
            logParts.push(string_markup_1.markupTag('success', string_markup_1.escapeMarkup(suffix)));
        }
        // Add source
        if (filename !== undefined && line !== undefined && column !== undefined) {
            const header = diagnostics_1.diagnosticLocationToMarkupFilelink({
                filename,
                start: {
                    index: ob1_1.ob1Number0Neg1,
                    line,
                    column,
                },
            });
            if (logParts.length === 0) {
                logParts.push(header);
            }
            else {
                logParts.push(`(<dim>${header}</dim>)`);
            }
        }
        reporter.logAll(logParts.join(' '));
        if (shownCodeFrames < 2 &&
            filename !== undefined &&
            line !== undefined &&
            column !== undefined) {
            const pos = {
                index: ob1_1.ob1Number0Neg1,
                line,
                column,
            };
            const skipped = printFrame({
                type: 'frame',
                location: {
                    language,
                    filename,
                    sourceType: 'module',
                    start: pos,
                    end: pos,
                    sourceText: code,
                },
            }, {
                ...opts,
                reporter,
            });
            if (!skipped) {
                reporter.br(true);
                shownCodeFrames++;
            }
        }
    }, {
        ordered: true,
        truncate: opts.flags.verboseDiagnostics ? undefined : 20,
    });
    return DID_PRINT;
}
function printLog(item, opts) {
    const { reporter } = opts;
    const { text: message, category } = item;
    if (message !== undefined) {
        switch (category) {
            case 'none': {
                reporter.logAll(message);
                break;
            }
            case 'warn': {
                reporter.warn(message);
                break;
            }
            case 'info': {
                reporter.info(message);
                break;
            }
            case 'error': {
                reporter.error(message);
                break;
            }
            default:
                throw new Error(`Unknown message item log category ${category}`);
        }
    }
    return item.compact ? DID_NOT_PRINT : DID_PRINT;
}
function cleanMessage(msg) {
    msg = msg.trim();
    if (msg.endsWith('.')) {
        msg = msg.slice(0, -1);
    }
    return msg;
}
