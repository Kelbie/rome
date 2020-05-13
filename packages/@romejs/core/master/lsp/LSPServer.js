"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const consume_1 = require("@romejs/consume");
const path_1 = require("@romejs/path");
const ob1_1 = require("@romejs/ob1");
const string_markup_1 = require("@romejs/string-markup");
const Linter_1 = require("../linter/Linter");
const MasterRequest_1 = require("../MasterRequest");
const client_1 = require("@romejs/core/common/types/client");
const string_diff_1 = require("@romejs/string-diff");
const cli_reporter_1 = require("@romejs/cli-reporter");
const HEADERS_END = '\r\n\r\n';
function parseHeaders(buffer) {
    const headers = new Map();
    for (const line of buffer.split('\n')) {
        const clean = line.trim();
        const match = clean.match(/^(.*?): (.*?)$/);
        if (match == null) {
            throw new Error(`Invalid header: ${clean}`);
        }
        const [, key, value] = match;
        headers.set(key.toLowerCase(), value);
    }
    const length = headers.get('content-length');
    if (length === undefined) {
        throw new Error('Expected Content-Length');
    }
    headers.delete('content-length');
    return {
        length: Number(length),
        extra: headers,
    };
}
function convertPositionToLSP(pos) {
    if (pos === undefined) {
        return {
            line: ob1_1.ob1Number0,
            character: ob1_1.ob1Number0,
        };
    }
    else {
        return {
            line: ob1_1.ob1Coerce1To0(pos.line),
            character: pos.column,
        };
    }
}
function convertDiagnosticLocationToLSPRange(location) {
    return {
        start: convertPositionToLSP(location.start),
        end: convertPositionToLSP(location.end),
    };
}
function convertDiagnosticsToLSP(diagnostics, master) {
    const lspDiagnostics = [];
    for (const { description, location } of diagnostics) {
        // Infer relatedInformation from log messages followed by frames
        let relatedInformation = [];
        const { advice } = description;
        for (let i = 0; i < advice.length; i++) {
            const item = advice[i];
            const nextItem = advice[i + 1];
            if (item.type === 'log' &&
                nextItem !== undefined &&
                nextItem.type === 'frame') {
                const abs = master.projectManager.getFilePathFromUidOrAbsolute(nextItem.location.filename);
                if (abs !== undefined) {
                    relatedInformation.push({
                        message: string_markup_1.markupToPlainTextString(item.text),
                        location: {
                            uri: `file://${abs.join()}`,
                            range: convertDiagnosticLocationToLSPRange(nextItem.location),
                        },
                    });
                }
            }
        }
        lspDiagnostics.push({
            severity: 1,
            range: convertDiagnosticLocationToLSPRange(location),
            message: string_markup_1.markupToPlainTextString(description.message.value),
            code: description.category,
            source: 'rome',
            relatedInformation,
        });
    }
    return lspDiagnostics;
}
function getPathFromTextDocument(consumer) {
    return path_1.createAbsoluteFilePath(consumer.get('uri').asString());
}
function diffTextEdits(original, desired) {
    const edits = [];
    const diffs = string_diff_1.default(original, desired);
    let currLine = ob1_1.ob1Number0;
    let currChar = ob1_1.ob1Number0;
    function advance(str) {
        for (const char of str) {
            if (char === '\n') {
                currLine = ob1_1.ob1Inc(currLine);
                currChar = ob1_1.ob1Number0;
            }
            else {
                currChar = ob1_1.ob1Inc(currChar);
            }
        }
    }
    function getPosition() {
        return {
            line: currLine,
            character: currChar,
        };
    }
    for (const [type, text] of diffs) {
        switch (type) {
            case string_diff_1.diffConstants.ADD: {
                const pos = getPosition();
                edits.push({
                    range: {
                        start: pos,
                        end: pos,
                    },
                    newText: text,
                });
                break;
            }
            case string_diff_1.diffConstants.DELETE: {
                const start = getPosition();
                advance(text);
                const end = getPosition();
                edits.push({
                    range: {
                        start,
                        end,
                    },
                    newText: '',
                });
                break;
            }
            case string_diff_1.diffConstants.EQUAL: {
                advance(text);
                break;
            }
        }
    }
    return edits;
}
let progressTokenCounter = 0;
class LSPProgress extends cli_reporter_1.ReporterProgressBase {
    constructor(server, reporter, opts) {
        super(reporter, opts);
        this.server = server;
        this.token = progressTokenCounter++;
        this.lastRenderKey = '';
        server.write({
            type: '$/progress',
            params: {
                token: this.token,
                value: {
                    kind: 'begin',
                    cancellable: false,
                    title: this.title,
                    percentage: 0,
                },
            },
        });
    }
    render() {
        const total = this.total === undefined ? 0 : this.total;
        const percentage = Math.floor(100 / total * this.current);
        // Make sure we don't send pointless duplicate messages
        const renderKey = `percent:${percentage},text:${this.text}`;
        if (this.lastRenderKey === renderKey) {
            return;
        }
        this.lastRenderKey = renderKey;
        this.server.write({
            type: '$/progress',
            params: {
                token: this.token,
                value: {
                    kind: 'report',
                    cancellable: false,
                    message: this.text,
                    percentage,
                },
            },
        });
    }
    end() {
        this.server.write({
            type: '$/progress',
            params: {
                token: this.token,
                value: {
                    kind: 'end',
                },
            },
        });
    }
}
class LSPServer {
    constructor(request) {
        this.status = 'IDLE';
        this.buffer = '';
        this.nextHeaders = undefined;
        this.request = request;
        this.master = request.master;
        this.client = request.client;
        this.lintSessionsPending = new path_1.AbsoluteFilePathSet();
        this.lintSessions = new path_1.AbsoluteFilePathMap();
        request.endEvent.subscribe(() => {
            this.shutdown();
        });
    }
    write(res) {
        const json = JSON.stringify(res);
        const out = `Content-Length: ${String(json.length)}${HEADERS_END}${json}`;
        this.client.bridge.lspFromServerBuffer.send(out);
    }
    createFakeMasterRequest(commandName, args = []) {
        return new MasterRequest_1.default({
            client: this.client,
            master: this.master,
            query: {
                requestFlags: client_1.DEFAULT_CLIENT_REQUEST_FLAGS,
                commandFlags: {},
                args,
                commandName,
                silent: true,
                noData: false,
                terminateWhenIdle: false,
            },
        });
    }
    unwatchProject(path) {
        // TODO maybe unset all buffers?
        const req = this.lintSessions.get(path);
        if (req !== undefined) {
            req.teardown(MasterRequest_1.EMPTY_SUCCESS_RESPONSE);
            this.lintSessions.delete(path);
        }
    }
    createProgress(opts) {
        return new LSPProgress(this, this.request.reporter, opts);
    }
    async watchProject(path) {
        if (this.lintSessions.has(path) || this.lintSessionsPending.has(path)) {
            return;
        }
        this.lintSessionsPending.add(path);
        const project = await this.master.projectManager.findProject(path);
        if (project === undefined) {
            // Not a Rome project
            this.lintSessionsPending.delete(path);
            return;
        }
        const req = this.createFakeMasterRequest('lsp_project', [path.join()]);
        await req.init();
        const linter = new Linter_1.default(req, {
            save: false,
            hasDecisions: false,
            formatOnly: false,
        });
        const subscription = await linter.watch({
            onRunStart: () => { },
            createProgress: () => {
                return this.createProgress();
            },
            onChanges: ({ changes }) => {
                for (const { ref, diagnostics } of changes) {
                    if (ref === undefined) {
                        // Cannot display diagnostics without a reference
                        continue;
                    }
                    // We want to filter pendingFixes because we'll autoformat the file on save if necessary and it's just noise
                    const processor = this.request.createDiagnosticsProcessor();
                    processor.addFilter({
                        category: 'lint/pendingFixes',
                    });
                    processor.addDiagnostics(diagnostics);
                    this.write({
                        method: 'textDocument/publishDiagnostics',
                        params: {
                            uri: `file://${ref.real.join()}`,
                            diagnostics: convertDiagnosticsToLSP(processor.getDiagnostics(), this.master),
                        },
                    });
                }
            },
        });
        req.endEvent.subscribe(() => {
            subscription.unsubscribe();
        });
        this.lintSessions.set(path, req);
        this.lintSessionsPending.delete(path);
    }
    shutdown() {
        for (const path of this.lintSessions.keys()) {
            this.unwatchProject(path);
        }
        this.lintSessions.clear();
    }
    async sendClientRequest(req) {
        return this.master.handleRequest(this.client, {
            silent: true,
            ...req,
        });
    }
    async handleRequest(method, params) {
        switch (method) {
            case 'initialize': {
                const rootUri = params.get('rootUri');
                if (rootUri.exists()) {
                    this.watchProject(path_1.createAbsoluteFilePath(rootUri.asString()));
                }
                const workspaceFolders = params.get('workspaceFolders');
                if (workspaceFolders.exists()) {
                    for (const elem of workspaceFolders.asArray()) {
                        this.watchProject(getPathFromTextDocument(elem));
                    }
                }
                return {
                    capabilities: {
                        textDocumentSync: {
                            openClose: true,
                            // This sends over the full text on change. We should make this incremental later
                            change: 1,
                        },
                        documentFormattingProvider: true,
                        workspaceFolders: {
                            supported: true,
                            changeNotifications: true,
                        },
                    },
                    serverInfo: {
                        name: 'rome',
                    },
                };
            }
            case 'textDocument/formatting': {
                const path = getPathFromTextDocument(params.get('textDocument'));
                const project = this.master.projectManager.findProjectExisting(path);
                if (project === undefined) {
                    // Not in a Rome project
                    return null;
                }
                const res = await this.request.requestWorkerFormat(path, {});
                if (res === undefined) {
                    // Not a file we support formatting
                    return null;
                }
                return diffTextEdits(res.original, res.formatted);
            }
            case 'shutdown': {
                this.shutdown();
                break;
            }
        }
        return null;
    }
    async handleNotification(method, params) {
        switch (method) {
            case 'workspace/didChangeWorkspaceFolders': {
                for (const elem of params.get('added').asArray()) {
                    this.watchProject(getPathFromTextDocument(elem));
                }
                for (const elem of params.get('removed').asArray()) {
                    this.unwatchProject(getPathFromTextDocument(elem));
                }
                break;
            }
            case 'textDocument/didChange': {
                const path = getPathFromTextDocument(params.get('textDocument'));
                const content = params.get('contentChanges').asArray()[0].get('text').asString();
                await this.request.requestWorkerUpdateBuffer(path, content);
                break;
            }
        }
    }
    normalizeMessage(content) {
        try {
            const data = JSON.parse(content);
            const consumer = consume_1.consumeUnknown(data, 'lsp/parse');
            return consumer;
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                console.error('JSON parse error', content);
                return undefined;
            }
            else {
                throw err;
            }
        }
    }
    async onMessage(headers, content) {
        const consumer = this.normalizeMessage(content);
        if (consumer === undefined) {
            return;
        }
        if (!consumer.has('method')) {
            console.error('NO METHOD', content);
            return;
        }
        const method = consumer.get('method').asString();
        const params = consumer.get('params');
        if (consumer.has('id')) {
            const id = consumer.get('id').asNumber();
            try {
                const res = {
                    id,
                    result: await this.handleRequest(method, params),
                };
                this.write(res);
            }
            catch (err) {
                const res = {
                    id,
                    error: {
                        code: -32603,
                        message: err.message,
                    },
                };
                this.write(res);
            }
        }
        else {
            await this.handleNotification(method, params);
        }
    }
    process() {
        switch (this.status) {
            case 'IDLE': {
                if (this.buffer.length > 0) {
                    this.status = 'WAITING_FOR_HEADERS_END';
                    this.process();
                }
                break;
            }
            case 'WAITING_FOR_HEADERS_END': {
                const endIndex = this.buffer.indexOf(HEADERS_END);
                if (endIndex !== -1) {
                    // Parse headers
                    const rawHeaders = this.buffer.slice(0, endIndex);
                    this.nextHeaders = parseHeaders(rawHeaders);
                    // Process rest of the buffer
                    this.status = 'WAITING_FOR_RESPONSE_END';
                    this.buffer = this.buffer.slice(endIndex + HEADERS_END.length);
                    this.process();
                }
                break;
            }
            case 'WAITING_FOR_RESPONSE_END': {
                const headers = this.nextHeaders;
                if (headers === undefined) {
                    throw new Error('Expected headers due to our status');
                }
                if (this.buffer.length >= headers.length) {
                    const content = this.buffer.slice(0, headers.length);
                    this.onMessage(headers, content);
                    // Reset headers and trim content
                    this.nextHeaders = undefined;
                    this.buffer = this.buffer.slice(headers.length);
                    // Process rest of the buffer
                    this.status = 'IDLE';
                    this.process();
                }
                break;
            }
        }
    }
    append(data) {
        this.buffer += data;
        this.process();
    }
}
exports.default = LSPServer;
