"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ESC = '\x1b[';
exports.pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
].join('|');
exports.regex = new RegExp(exports.pattern, 'g');
function createEscape(num) {
    return `${ESC}${String(num)}m`;
}
exports.formatAnsi = {
    reset(str) {
        return createEscape(0) + str + createEscape(0);
    },
    fileHyperlink(name, filename) {
        let href = `file://`;
        const { HOSTNAME } = process.env;
        if (HOSTNAME != null) {
            href += `${HOSTNAME}/`;
        }
        href += filename;
        return exports.formatAnsi.hyperlink(name, href);
    },
    hyperlink(name, href) {
        return `\u001b]8;;${href}\u0007${name}\u001b]8;;\u0007`;
    },
    rgb(str, color) {
        return (`\u001b[38;2;${String(color.r)};${String(color.g)};${String(color.b)}m` +
            str +
            createEscape(39));
    },
    bgRgb(str, color) {
        return (`\u001b[48;2;${String(color.r)};${String(color.g)};${String(color.b)}m` +
            str +
            createEscape(49));
    },
    bold(str) {
        return createEscape(1) + str + createEscape(22);
    },
    dim(str) {
        return createEscape(2) + str + createEscape(22);
    },
    italic(str) {
        return createEscape(3) + str + createEscape(23);
    },
    underline(str) {
        return createEscape(4) + str + createEscape(24);
    },
    inverse(str) {
        return createEscape(7) + str + createEscape(27);
    },
    hidden(str) {
        return createEscape(8) + str + createEscape(28);
    },
    strikethrough(str) {
        return createEscape(9) + str + createEscape(29);
    },
    black(str) {
        return createEscape(30) + str + createEscape(39);
    },
    brightBlack(str) {
        return createEscape(90) + str + createEscape(39);
    },
    red(str) {
        return createEscape(31) + str + createEscape(39);
    },
    brightRed(str) {
        return createEscape(91) + str + createEscape(39);
    },
    green(str) {
        return createEscape(32) + str + createEscape(39);
    },
    brightGreen(str) {
        return createEscape(92) + str + createEscape(39);
    },
    yellow(str) {
        return createEscape(33) + str + createEscape(39);
    },
    brightYellow(str) {
        return createEscape(93) + str + createEscape(39);
    },
    blue(str) {
        return createEscape(34) + str + createEscape(39);
    },
    brightBlue(str) {
        return createEscape(94) + str + createEscape(39);
    },
    magenta(str) {
        return createEscape(35) + str + createEscape(39);
    },
    brightMagenta(str) {
        return createEscape(95) + str + createEscape(39);
    },
    cyan(str) {
        return createEscape(36) + str + createEscape(39);
    },
    brightCyan(str) {
        return createEscape(96) + str + createEscape(39);
    },
    white(str) {
        return createEscape(37) + str + createEscape(39);
    },
    brightWhite(str) {
        return createEscape(97) + str + createEscape(39);
    },
    bgBlack(str) {
        return createEscape(40) + str + createEscape(49);
    },
    bgBrightBlack(str) {
        return createEscape(100) + str + createEscape(49);
    },
    bgRed(str) {
        return createEscape(41) + str + createEscape(49);
    },
    bgBrightRed(str) {
        return createEscape(101) + str + createEscape(49);
    },
    bgGreen(str) {
        return createEscape(42) + str + createEscape(49);
    },
    bgBrightGreen(str) {
        return createEscape(102) + str + createEscape(49);
    },
    bgYellow(str) {
        return createEscape(43) + str + createEscape(49);
    },
    bgBrightYellow(str) {
        return createEscape(103) + str + createEscape(49);
    },
    bgBlue(str) {
        return createEscape(44) + str + createEscape(49);
    },
    bgBrightBlue(str) {
        return createEscape(104) + str + createEscape(49);
    },
    bgMagenta(str) {
        return createEscape(45) + str + createEscape(49);
    },
    bgBrightMagenta(str) {
        return createEscape(105) + str + createEscape(49);
    },
    bgCyan(str) {
        return createEscape(46) + str + createEscape(49);
    },
    bgBrightCyan(str) {
        return createEscape(106) + str + createEscape(49);
    },
    bgWhite(str) {
        return createEscape(47) + str + createEscape(49);
    },
    bgBrightWhite(str) {
        return createEscape(107) + str + createEscape(49);
    },
};
function stripAnsi(str) {
    return str.replace(exports.regex, '');
}
exports.stripAnsi = stripAnsi;
function hasAnsi(str) {
    return exports.regex.test(str);
}
exports.hasAnsi = hasAnsi;
exports.ansiEscapes = {
    clearScreen: '\x1bc',
    eraseLine: `${ESC}2K`,
    cursorUp(count = 1) {
        return `${ESC}${count}A`;
    },
    cursorTo(x, y) {
        if (y === undefined) {
            return `${ESC}${x + 1}G`;
        }
        return `${ESC}${y + 1};${x + 1}H`;
    },
};
