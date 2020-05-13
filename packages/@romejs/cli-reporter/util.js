"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
function mergeProgresses(progresses) {
    if (progresses.length === 1) {
        return progresses[0];
    }
    return {
        render: () => {
            for (const progress of progresses) {
                progress.render();
            }
        },
        setCurrent: (current) => {
            for (const progress of progresses) {
                progress.setCurrent(current);
            }
        },
        setTotal: (total, approximate) => {
            for (const progress of progresses) {
                progress.setTotal(total, approximate);
            }
        },
        setText: (text) => {
            for (const progress of progresses) {
                progress.setText(text);
            }
        },
        pushText: (text) => {
            for (const progress of progresses) {
                progress.pushText(text);
            }
        },
        popText: (text) => {
            for (const progress of progresses) {
                progress.popText(text);
            }
        },
        setApproximateETA: (duration) => {
            for (const progress of progresses) {
                progress.setApproximateETA(duration);
            }
        },
        tick: () => {
            for (const progress of progresses) {
                progress.tick();
            }
        },
        end: () => {
            for (const progress of progresses) {
                progress.end();
            }
        },
        pause: () => {
            for (const progress of progresses) {
                progress.pause();
            }
        },
        resume: () => {
            for (const progress of progresses) {
                progress.resume();
            }
        },
    };
}
exports.mergeProgresses = mergeProgresses;
function onKeypress(reporter, callback) {
    const stdin = reporter.getStdin();
    setRawMode(stdin, true);
    readline.emitKeypressEvents(stdin);
    function onkeypress(chunk, key) {
        switch (key.name) {
            case 'c': {
                if (key.ctrl) {
                    reporter.br(true);
                    reporter.warn('Cancelled by user');
                    process.exit(1);
                }
                return;
            }
            case 'escape': {
                reporter.br(true);
                reporter.warn('Cancelled by user');
                process.exit(1);
                return;
            }
        }
        callback(key);
    }
    stdin.addListener('keypress', onkeypress);
    return {
        finish() {
            stdin.removeListener('keypress', onkeypress);
            setRawMode(stdin, false);
        },
    };
}
exports.onKeypress = onKeypress;
function setRawMode(stdin, raw) {
    if (stdin.isTTY && stdin.setRawMode !== undefined) {
        stdin.setRawMode(raw);
    }
    if (raw) {
        stdin.resume();
    }
    else {
        stdin.pause();
    }
}
exports.setRawMode = setRawMode;
