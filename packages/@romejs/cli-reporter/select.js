"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const util_1 = require("./util");
function formatShortcut({ shortcut }) {
    if (shortcut === undefined) {
        return '';
    }
    else {
        return ` <dim>(shortcut ${shortcut})</dim>`;
    }
}
async function select(reporter, message, { options, defaults = [], radio = false, yes = false, }) {
    const optionNames = [];
    const seenShortcuts = new Set();
    // Verify there's no shortcut collisions and remove empty options
    for (const key in options) {
        const option = options[key];
        if (option !== undefined) {
            optionNames.push(key);
            const { shortcut } = option;
            if (shortcut !== undefined) {
                if (seenShortcuts.has(shortcut)) {
                    throw new Error(`Multiple options have the shortcut ${shortcut}`);
                }
                else {
                    seenShortcuts.add(shortcut);
                }
            }
        }
    }
    let optionCount = optionNames.length;
    if (optionCount === 0) {
        return new Set();
    }
    if (yes) {
        return new Set(defaults);
    }
    let prompt = `<dim>❯</dim> <emphasis>${message}</emphasis>`;
    reporter.logAll(prompt);
    if (radio) {
        reporter.info('Use arrow keys and then <emphasis>enter</emphasis> to select an option');
    }
    else {
        reporter.info('Use arrow keys and <emphasis>space</emphasis> to select or deselect options and then <emphasis>enter</emphasis> to confirm');
    }
    const selectedOptions = new Set(defaults);
    let activeOption = 0;
    // Set first option if this is a radio
    if (radio && !defaults.length) {
        selectedOptions.add(optionNames[0]);
    }
    function boundActive() {
        activeOption = Math.min(activeOption, optionCount - 1);
        activeOption = Math.max(activeOption, 0);
        if (radio) {
            selectedOptions.clear();
            selectedOptions.add(optionNames[activeOption]);
        }
    }
    // If we aren't a radio then set the active option to the bottom of any that are enabled
    if (!radio) {
        while (selectedOptions.has(optionNames[activeOption])) {
            activeOption++;
        }
    }
    function render() {
        const optionNames = Object.keys(options);
        for (let i = 0; i < optionNames.length; i++) {
            const key = optionNames[i];
            const option = options[key];
            const { label } = option;
            const shortcut = formatShortcut(option);
            let formattedLabel = optionNames.indexOf(key) === activeOption
                ? `<underline>${label}</underline>`
                : label;
            let symbol = '';
            if (radio) {
                symbol = selectedOptions.has(key) ? '\u25c9' : '\u25ef';
            }
            else {
                symbol = selectedOptions.has(key) ? '\u2611' : '\u2610';
            }
            reporter.logAll(`  ${symbol} ${formattedLabel}${shortcut}`, {
                // Don't put a newline on the last option
                newline: i !== optionNames.length - 1,
            });
        }
    }
    function cleanup() {
        for (let i = 0; i < optionCount; i++) {
            reporter.writeAll(string_markup_1.ansiEscapes.eraseLine);
            // Don't move above the top line
            if (i !== optionCount - 1) {
                reporter.writeAll(string_markup_1.ansiEscapes.cursorUp());
            }
        }
        reporter.writeAll(string_markup_1.ansiEscapes.cursorTo(0));
    }
    function toggleOption(optionName) {
        if (selectedOptions.has(optionName)) {
            selectedOptions.delete(optionName);
        }
        else {
            selectedOptions.add(optionName);
        }
    }
    const stdin = reporter.getStdin();
    render();
    util_1.setRawMode(stdin, true);
    await new Promise((resolve) => {
        const keypress = util_1.onKeypress(reporter, (key) => {
            // Check if this is an option shortcut
            if (!key.ctrl) {
                for (const optionName in options) {
                    const option = options[optionName];
                    if (option === undefined) {
                        continue;
                    }
                    const { shortcut } = option;
                    if (shortcut === key.name) {
                        if (radio) {
                            selectedOptions.clear();
                            selectedOptions.add(optionName);
                            finish();
                        }
                        else {
                            toggleOption(optionName);
                        }
                        return;
                    }
                }
            }
            switch (key.name) {
                case 'up': {
                    activeOption--;
                    break;
                }
                case 'down': {
                    activeOption++;
                    break;
                }
                case 'space': {
                    if (!radio) {
                        toggleOption(optionNames[activeOption]);
                    }
                    break;
                }
                case 'return': {
                    finish();
                    return;
                }
                default:
                    return;
            }
            boundActive();
            cleanup();
            render();
        });
        function finish() {
            cleanup();
            // Remove initial help message
            reporter.writeAll(string_markup_1.ansiEscapes.cursorUp());
            reporter.writeAll(string_markup_1.ansiEscapes.eraseLine);
            // Remove initial log message
            reporter.writeAll(string_markup_1.ansiEscapes.cursorUp());
            reporter.writeAll(string_markup_1.ansiEscapes.eraseLine);
            prompt += ': ';
            if (selectedOptions.size > 0) {
                prompt += Array.from(selectedOptions, (key) => options[key].label).join(', ');
            }
            else {
                prompt += '<dim>none</dim>';
            }
            reporter.logAll(prompt);
            // Stop listening for keypress
            keypress.finish();
            resolve();
        }
    });
    return selectedOptions;
}
exports.default = select;
