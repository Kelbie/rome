"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const string_utils_1 = require("@romejs/string-utils");
const Progress_1 = require("./Progress");
const pretty_format_1 = require("@romejs/pretty-format");
const stream = require("stream");
const path_1 = require("@romejs/path");
const events_1 = require("@romejs/events");
const readline = require("readline");
const select_1 = require("./select");
const util_1 = require("./util");
let remoteProgressIdCounter = 0;
const INDENT = '  ';
function getStreamFormat(stdout) {
    return stdout !== undefined && stdout.isTTY === true ? 'ansi' : 'none';
}
class Reporter {
    constructor(opts = {}) {
        this.wrapCallback = (callback) => {
            const { wrapperFactory } = this;
            if (wrapperFactory === undefined) {
                return callback;
            }
            else {
                return wrapperFactory(callback);
            }
        };
        this.programName =
            opts.programName === undefined ? 'rome' : opts.programName;
        this.programVersion = opts.programVersion;
        this.noProgress = process.env.CI === '1';
        this.isVerbose = Boolean(opts.verbose);
        this.startTime = opts.startTime === undefined ? Date.now() : opts.startTime;
        this.hasClearScreen =
            opts.hasClearScreen === undefined ? true : opts.hasClearScreen;
        this.activeElements = new Set();
        this.indentLevel = 0;
        this.indentString = '';
        this.enabled = opts.disabled === true ? 0 : 1;
        this.markupOptions =
            opts.markupOptions === undefined ? {} : opts.markupOptions;
        this.streamsWithDoubleNewlineEnd = new Set();
        this.streamsWithNewlineEnd = new Set();
        this.shouldRedirectOutToErr = false;
        this.stdin = opts.stdin;
        this.wrapperFactory = opts.wrapperFactory;
        this.remoteClientProgressBars = new Map();
        this.remoteServerProgressBars = new Map();
        this.sendRemoteServerMessage = new events_1.Event({
            name: 'sendRemoteServerMessage',
        });
        this.sendRemoteClientMessage = new events_1.Event({
            name: 'sendRemoteClientMessage',
        });
        this.isRemote = opts.useRemoteProgressBars === true;
        this.outStreams = new Set();
        this.errStreams = new Set();
        this.streams = new Set();
        if (opts.streams !== undefined) {
            for (const stream of opts.streams) {
                this.addStream(stream);
            }
        }
    }
    attachStdoutStreams(stdout, stderr) {
        const columns = stdout === undefined || stdout.columns === undefined
            ? Reporter.DEFAULT_COLUMNS
            : stdout.columns;
        const columnsUpdated = new events_1.Event({
            name: 'columnsUpdated',
        });
        // Windows terminals are awful
        const unicode = process.platform !== 'win32';
        const outStream = {
            type: 'out',
            format: getStreamFormat(stdout),
            columns,
            unicode,
            write(chunk) {
                if (stdout !== undefined) {
                    stdout.write(chunk);
                }
            },
            teardown() { },
        };
        const errStream = {
            type: 'error',
            format: getStreamFormat(stderr),
            columns,
            unicode,
            write(chunk) {
                if (stderr !== undefined) {
                    stderr.write(chunk);
                }
            },
        };
        // Watch for resizing
        if (outStream.format === 'ansi' && stdout !== undefined) {
            const onStdoutResize = () => {
                if (stdout?.columns !== undefined) {
                    const { columns } = stdout;
                    columnsUpdated.send(columns);
                    this.setStreamColumns([outStream, errStream], columns);
                }
            };
            outStream.teardown = () => {
                stdout.off('resize', onStdoutResize);
            };
            stdout.on('resize', onStdoutResize);
        }
        this.addStream(outStream);
        this.addStream(errStream);
        return {
            columnsUpdated,
            stdout: outStream,
            stderr: errStream,
        };
    }
    attachCaptureStream(format = 'none') {
        let buff = '';
        const stream = {
            format,
            type: 'all',
            columns: Reporter.DEFAULT_COLUMNS,
            unicode: true,
            write(chunk) {
                buff += chunk;
            },
        };
        this.addStream(stream);
        return {
            read() {
                return buff;
            },
            remove: () => {
                this.removeStream(stream);
            },
        };
    }
    static fromProcess(opts = {}) {
        const reporter = new Reporter({
            ...opts,
            markupOptions: {
                cwd: path_1.CWD_PATH,
                ...opts.markupOptions,
            },
        });
        reporter.attachStdoutStreams(process.stdout, process.stderr);
        return reporter;
    }
    processRemoteClientMessage(msg) {
        if (msg.type === 'PROGRESS_CREATE') {
            this.remoteClientProgressBars.set(msg.id, this.progressLocal(msg.opts, () => {
                this.sendRemoteServerMessage.call({
                    type: 'ENDED',
                    id: msg.id,
                });
            }));
            return;
        }
        let bar = this.remoteClientProgressBars.get(msg.id);
        if (bar === undefined) {
            throw new Error(`Remote reporter message for progress bar ${msg.id} that does not exist`);
        }
        bar.processRemoteClientMessage(msg);
        if (msg.type === 'PROGRESS_END') {
            this.remoteClientProgressBars.delete(msg.id);
        }
    }
    receivedRemoteServerMessage(msg) {
        // Currently the only message a remote Reporter can send is that it has ended
        switch (msg.type) {
            case 'ENDED': {
                const progress = this.remoteServerProgressBars.get(msg.id);
                if (progress !== undefined) {
                    progress.end();
                }
            }
        }
    }
    getMessagePrefix() {
        return '';
    }
    normalizeMessage(stream, tty, opts) {
        let msg = stream.format !== 'none' || opts.nonTTY === undefined ? tty : opts.nonTTY;
        if (opts.noPrefix !== true) {
            msg = this.getMessagePrefix() + msg;
        }
        // Don't indent if there is no indent, or the message is empty
        const { indentString } = this;
        if (this.streamsWithNewlineEnd.has(stream) &&
            indentString !== '' &&
            msg !== '') {
            // Indent each line, leaving out the indentation for empty lines
            msg = indentString + msg.replace(/\n([^\n])/g, `\n${indentString}$1`);
        }
        return msg;
    }
    redirectOutToErr(should) {
        const old = this.shouldRedirectOutToErr;
        this.shouldRedirectOutToErr = should;
        return old;
    }
    setStreamColumns(streams, columns) {
        for (const stream of streams) {
            if (!this.streams.has(stream)) {
                throw new Error("Trying to setStreamColumns on a stream that isn't attached to this Reporter");
            }
            stream.columns = columns;
        }
        for (const elem of this.activeElements) {
            elem.render();
        }
    }
    addStream(stream) {
        this.streamsWithNewlineEnd.add(stream);
        this.streams.add(stream);
        if (stream.type === 'error' || stream.type === 'all') {
            this.errStreams.add(stream);
        }
        if (stream.type === 'out' || stream.type === 'all') {
            this.outStreams.add(stream);
        }
    }
    removeStream(stream) {
        if (stream.teardown !== undefined) {
            stream.teardown();
        }
        this.streams.delete(stream);
        this.outStreams.delete(stream);
        this.errStreams.delete(stream);
    }
    //# Stdin
    getStdin() {
        const { stdin } = this;
        if (stdin === undefined) {
            throw new Error('This operation expected a stdin but we have none');
        }
        return stdin;
    }
    async question(message, { hint, default: def = '', yes = false } = {}) {
        if (yes) {
            return def;
        }
        const stdin = this.getStdin();
        const origPrompt = `<dim emphasis>?</dim> <emphasis>${message}</emphasis>`;
        let prompt = origPrompt;
        if (hint !== undefined) {
            prompt += ` <dim>${hint}</dim>`;
        }
        if (def !== '') {
            prompt += ` (${def})`;
        }
        prompt += ': ';
        this.logAll(prompt, {
            newline: false,
        });
        const rl = readline.createInterface({
            input: stdin,
            output: new stream.Writable({
                write: (chunk, encoding, callback) => {
                    this.writeAll(chunk);
                    callback();
                },
            }),
            terminal: false,
        });
        return new Promise((resolve) => {
            rl.on('line', (line) => {
                rl.close();
                const normalized = line === '' ? def : line;
                // Replace initial prompt
                this.writeAll(string_markup_1.ansiEscapes.cursorUp());
                this.writeAll(string_markup_1.ansiEscapes.eraseLine);
                let prompt = origPrompt;
                prompt += ': ';
                if (normalized === '') {
                    prompt += '<dim>empty</dim>';
                }
                else {
                    prompt += normalized;
                }
                this.logAll(prompt);
                resolve(normalized);
            });
        });
    }
    async questionValidate(message, validate, options = {}) {
        while (true) {
            let res;
            await this.question(`${message}`, {
                ...options,
                normalize: (value) => {
                    res = validate(value);
                    if (res[0] === true && typeof res[1] === 'string') {
                        return res[1];
                    }
                    else {
                        return value;
                    }
                },
            });
            if (res === undefined) {
                throw new Error('normalize should have been called');
            }
            if (res[0] === false) {
                this.error(res[1]);
                continue;
            }
            else {
                return res[1];
            }
        }
    }
    async radioConfirm(message) {
        const answer = await this.radio(message, {
            options: {
                yes: {
                    label: 'Yes',
                    shortcut: 'y',
                },
                no: {
                    label: 'No',
                    shortcut: 'n',
                },
            },
        });
        return answer === 'yes';
    }
    async confirm(message = 'Press any key to continue') {
        this.logAll(`<dim>${message}</dim>`, { newline: false });
        await new Promise((resolve) => {
            const keypress = util_1.onKeypress(this, () => {
                keypress.finish();
                resolve();
            });
        });
        // Newline
        this.logAll('');
    }
    async radio(message, arg) {
        const set = await this.select(message, { ...arg, radio: true });
        // Should always have at least one element
        return Array.from(set)[0];
    }
    async select(message, args) {
        return select_1.default(this, message, args);
    }
    //# Control
    isEnabled(stderr) {
        return this.getStreams(stderr).size > 0;
    }
    getStreams(stderr) {
        if (this.enabled === 0) {
            return new Set();
        }
        if (this.shouldRedirectOutToErr) {
            return this.errStreams;
        }
        if (stderr) {
            return this.errStreams;
        }
        return this.outStreams;
    }
    enable() {
        let alreadyDisabled = false;
        this.enabled++;
        return () => {
            if (alreadyDisabled) {
                throw new Error('Already disabled Reporter');
            }
            this.enabled--;
            alreadyDisabled = true;
        };
    }
    //# LIFECYCLE
    teardown() {
        for (const stream of this.streams) {
            this.removeStream(stream);
        }
        for (const elem of this.activeElements) {
            elem.end();
        }
        this.activeElements.clear();
    }
    fork(opts = {}) {
        return new Reporter({
            streams: [...this.streams],
            verbose: this.isVerbose,
            markupOptions: this.markupOptions,
            wrapperFactory: this.wrapperFactory,
            ...opts,
        });
    }
    //# INDENTATION METHODS
    indent(callback) {
        this.indentLevel++;
        this.updateIndent();
        callback();
        this.indentLevel--;
        this.updateIndent();
    }
    noIndent(callback) {
        const prevIndentLevel = this.indentLevel;
        this.indentLevel = 0;
        this.updateIndent();
        callback();
        this.indentLevel = prevIndentLevel;
        this.updateIndent();
    }
    updateIndent() {
        this.indentString = INDENT.repeat(this.indentLevel);
    }
    //# INTERNAL
    prependEmoji(stream, msg, emoji, fallback) {
        if (stream.format === 'none') {
            return `${emoji} ${msg}`;
        }
        else {
            if (fallback === undefined) {
                return msg;
            }
            else {
                return `${fallback} ${msg}`;
            }
        }
    }
    //# VISUALISATION
    table(head, rawBody) {
        let body = '';
        if (head.length > 0) {
            body += '<tr>';
            for (const field of head) {
                body += `<td><emphasis>${field}</emphasis></td>`;
            }
            body += '</tr>';
        }
        for (const row of rawBody) {
            body += '<tr>';
            for (let field of row) {
                if (typeof field === 'string' || typeof field === 'number') {
                    field = { align: 'left', value: field };
                }
                let { value, align } = field;
                if (typeof value === 'number') {
                    value = `<number>${value}</number>`;
                }
                body += `<td align="${align}">${value}</td>`;
            }
            body += '</tr>';
        }
        this.logAll(`<table>${body}</table>`);
    }
    verboseInspect(val) {
        if (this.isVerbose) {
            this.inspect(val);
        }
    }
    inspect(value) {
        if (!this.isEnabled(false)) {
            return;
        }
        let formatted = value;
        if (typeof formatted !== 'number' && typeof formatted !== 'string') {
            formatted = pretty_format_1.default(formatted, { markup: true });
        }
        this.logAll(String(formatted));
    }
    //# ESCAPE HATCHES
    clearLineAll() {
        for (const stream of this.getStreams(false)) {
            this.clearLineSpecific(stream);
        }
    }
    clearLineSpecific(stream) {
        stream.write(string_markup_1.ansiEscapes.eraseLine);
        stream.write(string_markup_1.ansiEscapes.cursorTo(0));
    }
    writeAll(msg, opts = {}) {
        for (const stream of this.getStreams(opts.stderr)) {
            this.writeSpecific(stream, msg, opts);
        }
    }
    writeSpecific(stream, msg, opts = {}) {
        if (!this.isEnabled(opts.stderr)) {
            return;
        }
        this.hasClearScreen = false;
        if (stream.format === 'ansi' && this.activeElements.size > 0) {
            // A progress bar is active and has probably drawn to the screen
            this.clearLineSpecific(stream);
        }
        stream.write(msg);
    }
    //# UTILITIES
    getTotalTime() {
        return Date.now() - this.startTime;
    }
    clearScreen() {
        for (const stream of this.getStreams(false)) {
            if (stream.format === 'ansi') {
                stream.write(string_markup_1.ansiEscapes.clearScreen);
            }
        }
        this.hasClearScreen = true;
    }
    //# SECTIONS
    heading(text) {
        this.br();
        this.logAll(`<inverse><emphasis>${text}</emphasis></inverse>`, {
            nonTTY: `# ${text}`,
        });
        this.br();
    }
    section(title, callback) {
        this.hr(title === undefined ? undefined : `<emphasis>${title}</emphasis>`);
        this.indent(() => {
            callback();
            this.br();
        });
    }
    hr(text = '') {
        const { hasClearScreen } = this;
        this.br();
        if (hasClearScreen && text === undefined) {
            return;
        }
        this.logAll(`<hr>${text}</hr>`);
        this.br();
    }
    async steps(callbacks) {
        const total = callbacks.length;
        let current = 1;
        for (const { clear, message, callback } of callbacks) {
            this.step(current, total, message);
            if (clear) {
                this.hasClearScreen = true;
            }
            await callback();
            current++;
            // If a step doesn't produce any output, or just progress bars that are cleared, we can safely remove the previous `step` message line
            if (clear && this.hasClearScreen) {
                for (const stream of this.getStreams(false)) {
                    if (stream.format === 'ansi') {
                        stream.write(string_markup_1.ansiEscapes.cursorTo(0));
                        stream.write(string_markup_1.ansiEscapes.cursorUp());
                        stream.write(string_markup_1.ansiEscapes.eraseLine);
                    }
                }
            }
        }
    }
    step(current, total, msg) {
        if (msg.endsWith('?')) {
            msg = `${string_utils_1.removeSuffix(msg, '?')}...?`;
        }
        else {
            msg += '...';
        }
        this.logAll(`<dim>[${current}/${total}]</dim> ${msg}`);
    }
    br(force = false) {
        for (const stream of this.getStreams(false)) {
            if (!this.streamsWithDoubleNewlineEnd.has(stream) || force) {
                this.logOne(stream, '');
            }
        }
    }
    stripMarkup(str) {
        return string_markup_1.markupToPlainText(str, this.markupOptions).lines.join('\n');
    }
    markupify(stream, str, viewportShrink = 0) {
        if (str === '') {
            return { lines: [''], width: 0 };
        }
        const gridMarkupOptions = {
            ...this.markupOptions,
            columns: stream.columns - this.indentString.length - viewportShrink,
        };
        switch (stream.format) {
            case 'ansi':
                return string_markup_1.markupToAnsi(str, gridMarkupOptions);
            case 'html':
                // TODO
                return string_markup_1.markupToPlainText(str, gridMarkupOptions);
            case 'none':
                return string_markup_1.markupToPlainText(str, gridMarkupOptions);
            case 'markup':
                return {
                    width: 0,
                    lines: [str],
                };
        }
    }
    logAll(tty, opts = {}) {
        for (const stream of this.getStreams(opts.stderr)) {
            this.logOne(stream, tty, opts);
        }
    }
    logAllNoMarkup(tty, opts = {}) {
        for (const stream of this.getStreams(opts.stderr)) {
            this.logOneNoMarkup(stream, tty, opts);
        }
    }
    logOne(stream, tty, opts = {}) {
        const msg = stream.format !== 'none' || opts.nonTTY === undefined ? tty : opts.nonTTY;
        const { lines } = this.markupify(stream, msg);
        for (const line of lines) {
            this.logOneNoMarkup(stream, line, opts);
        }
    }
    logOneNoMarkup(stream, tty, opts = {}) {
        if (!this.isEnabled(opts.stderr)) {
            return;
        }
        let msg = this.normalizeMessage(stream, tty, opts);
        if (opts.newline !== false) {
            msg += '\n';
        }
        // Track if there's going to be a completely empty line
        const hasDoubleNewline = msg === '\n' || msg.endsWith('\n\n');
        if (hasDoubleNewline) {
            this.streamsWithDoubleNewlineEnd.add(stream);
        }
        else {
            this.streamsWithDoubleNewlineEnd.delete(stream);
        }
        if (msg.endsWith('\n')) {
            this.streamsWithNewlineEnd.add(stream);
        }
        else {
            this.streamsWithNewlineEnd.delete(stream);
        }
        this.writeSpecific(stream, msg, opts);
    }
    logAllWithCategory(rawInner, args, opts) {
        if (!this.isEnabled(opts.stderr)) {
            return;
        }
        const inner = string_markup_1.markupTag(opts.markupTag, rawInner);
        for (const stream of this.getStreams(opts.stderr)) {
            // Format the prefix, selecting it depending on if we're a unicode stream
            const prefixInner = stream.unicode ? opts.unicodePrefix : opts.rawPrefix;
            const prefix = string_markup_1.markupTag('emphasis', string_markup_1.markupTag(opts.markupTag, this.getMessagePrefix() + prefixInner));
            // Should only be one line
            const { lines: prefixLines, width: prefixWidth } = this.markupify(stream, prefix);
            const prefixLine = prefixLines[0];
            if (prefixLines.length !== 1) {
                throw new Error('Expected 1 prefix line');
            }
            const { lines } = this.markupify(stream, inner, prefixWidth);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (i === 0) {
                    line = `${prefixLine}${line}`;
                }
                else {
                    line = `${' '.repeat(prefixWidth)}${line}`;
                }
                this.logOneNoMarkup(stream, line, {
                    noPrefix: true,
                    ...opts,
                });
            }
        }
    }
    success(msg, ...args) {
        this.logAllWithCategory(msg, args, {
            unicodePrefix: '\u2714 ',
            rawPrefix: '\u221a ',
            markupTag: 'success',
        });
    }
    error(msg, ...args) {
        this.logAllWithCategory(msg, args, {
            markupTag: 'error',
            unicodePrefix: '\u2716 ',
            rawPrefix: '\xd7 ',
            stderr: true,
        });
    }
    errorObj(err) {
        this.error(err.stack || err.message || err.name || 'Unknown Error');
    }
    info(msg, ...args) {
        this.logAllWithCategory(msg, args, {
            unicodePrefix: '\u2139 ',
            rawPrefix: 'i ',
            markupTag: 'info',
        });
    }
    warn(msg, ...args) {
        this.logAllWithCategory(msg, args, {
            unicodePrefix: '\u26a0 ',
            rawPrefix: '! ',
            markupTag: 'warn',
            stderr: true,
        });
    }
    verbose(msg, ...args) {
        if (this.isVerbose) {
            this.verboseForce(msg, args);
        }
    }
    verboseForce(msg, ...args) {
        this.logAllWithCategory(msg, args, {
            unicodePrefix: '\u26a1 ',
            rawPrefix: '* ',
            markupTag: 'dim',
        });
    }
    command(command) {
        this.logAll(`<dim>$ ${command}</dim>`, {
            nonTTY: `$ ${command}`,
        });
    }
    //# LISTS
    _getListIndentation() {
        // If we're at the top level then add some implicit indentation
        return this.indentLevel === 0 ? '  ' : '';
    }
    processedList(items, callback, opts = {}) {
        if (items.length === 0) {
            // We make some assumptions that there's at least one item
            return { truncated: false };
        }
        let truncatedCount = 0;
        let start = opts.start || 0;
        if (opts.truncate !== undefined && items.length > opts.truncate) {
            truncatedCount = items.length - opts.truncate;
            items = items.slice(0, opts.truncate);
            start += truncatedCount;
        }
        let buff = '';
        for (const item of items) {
            const reporter = this.fork({
                streams: [],
            });
            const stream = reporter.attachCaptureStream('markup');
            callback(reporter, item);
            stream.remove();
            buff += `<li>${stream.read()}</li>`;
        }
        if (opts.ordered) {
            this.logAll(string_markup_1.markupTag('ol', buff, { start, reversed: opts.reverse }));
        }
        else {
            this.logAll(`<ul>${buff}</ul>`);
        }
        if (truncatedCount > 0) {
            this.logAll(`<dim>and <number>${truncatedCount}</number> others...</dim>`);
            return { truncated: true };
        }
        else {
            return { truncated: false };
        }
    }
    list(items, opts = {}) {
        return this.processedList(items, (reporter, str) => {
            reporter.logAll(str, { newline: false });
        }, opts);
    }
    progress(opts) {
        if (this.isRemote) {
            return this.progressRemote(opts);
        }
        else {
            return this.progressLocal(opts);
        }
    }
    progressLocal(opts, onEnd) {
        const bar = new Progress_1.default(this, opts, () => {
            this.activeElements.delete(bar);
            if (onEnd !== undefined) {
                onEnd();
            }
        });
        this.activeElements.add(bar);
        return bar;
    }
    progressRemote(opts) {
        const id = `${process.pid}:${remoteProgressIdCounter++}`;
        this.sendRemoteClientMessage.send({
            type: 'PROGRESS_CREATE',
            opts,
            id,
        });
        let closed = false;
        const dispatch = (message) => {
            if (!closed) {
                this.sendRemoteClientMessage.send(message);
            }
        };
        const end = () => {
            this.activeElements.delete(progress);
            this.remoteServerProgressBars.delete(id);
            closed = true;
        };
        const progress = {
            render() {
                // Don't do anything
                // This is called when columns have updated and we want to force a rerender
            },
            setCurrent: (current) => {
                dispatch({
                    type: 'PROGRESS_SET_CURRENT',
                    current,
                    id,
                });
            },
            setTotal: (total, approximate = false) => {
                dispatch({
                    type: 'PROGRESS_SET_TOTAL',
                    total,
                    approximate,
                    id,
                });
            },
            setText: (text) => {
                dispatch({
                    type: 'PROGRESS_SET_TEXT',
                    text,
                    id,
                });
            },
            setApproximateETA: (duration) => {
                dispatch({
                    type: 'PROGRESS_SET_APPROXIMATE_ETA',
                    duration,
                    id,
                });
            },
            pushText: (text) => {
                dispatch({
                    type: 'PROGRESS_PUSH_TEXT',
                    text,
                    id,
                });
            },
            popText: (text) => {
                dispatch({
                    type: 'PROGRESS_POP_TEXT',
                    text,
                    id,
                });
            },
            tick: () => {
                dispatch({
                    type: 'PROGRESS_TICK',
                    id,
                });
            },
            end: () => {
                dispatch({
                    type: 'PROGRESS_END',
                    id,
                });
            },
            pause: () => {
                dispatch({
                    type: 'PROGRESS_PAUSE',
                    id,
                });
            },
            resume: () => {
                dispatch({
                    type: 'PROGRESS_RESUME',
                    id,
                });
            },
        };
        this.remoteServerProgressBars.set(id, {
            end,
        });
        this.activeElements.add(progress);
        return progress;
    }
}
exports.default = Reporter;
Reporter.DEFAULT_COLUMNS = 100;
