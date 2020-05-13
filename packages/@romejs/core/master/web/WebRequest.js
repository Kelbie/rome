"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@romejs/core");
const diagnostics_1 = require("@romejs/diagnostics");
const string_utils_1 = require("@romejs/string-utils");
const Bundler_1 = require("../bundler/Bundler");
const codec_websocket_1 = require("@romejs/codec-websocket");
const events_1 = require("@romejs/events");
const path_1 = require("@romejs/path");
const codec_url_1 = require("@romejs/codec-url");
const waitForever = new Promise(() => { });
function stripBundleSuffix(pathname) {
    return string_utils_1.removePrefix(string_utils_1.removeSuffix(pathname, '.bundle'), '/');
}
exports.stripBundleSuffix = stripBundleSuffix;
class WebRequest {
    constructor(server, req, res) {
        this.req = req;
        this.res = res;
        this.server = server;
        this.reporter = server.reporter;
        this.masterRequest = server.masterRequest;
        this.master = server.master;
        const reqUrl = req.url;
        if (reqUrl === undefined) {
            throw new Error('req.url should not be undefined');
        }
        this.url = codec_url_1.consumeUrl(reqUrl);
    }
    loadRawBody() {
        const { req } = this;
        req.setEncoding('utf8');
        let rawBody = '';
        return new Promise((resolve) => {
            req.on('data', (chunk) => {
                rawBody += chunk;
            });
            req.on('end', () => {
                resolve(rawBody);
            });
        });
    }
    async dispatch() {
        const { res } = this;
        try {
            const rawBody = await this.loadRawBody();
            await this.dispatchWithBody(rawBody);
            res.end();
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            let diagnostics = diagnostics_1.getDiagnosticsFromError(err);
            if (diagnostics === undefined) {
                diagnostics = [
                    diagnostics_1.deriveDiagnosticFromError(err, {
                        description: {
                            category: 'internalError/httpServer',
                        },
                    }),
                ];
            }
            //this.request.reporter.clear();
            try {
                const printer = this.masterRequest.createDiagnosticsPrinter(this.master.createDiagnosticsProcessor({
                    origins: [
                        {
                            category: 'WebRequest',
                        },
                    ],
                }));
                printer.processor.addDiagnostics(diagnostics);
                await printer.print();
            }
            catch (err) {
                this.reporter.warn('Failed trying to print diagnostics');
                this.reporter.error(err.stack);
            }
            res.end('Diagnostics available, see console');
        }
    }
    async dispatchWithBody(body) {
        const { res } = this;
        const pathname = this.url.path.asString();
        body;
        switch (pathname) {
            case '/favicon.ico': {
                res.end('');
                break;
            }
            case '/__rome__/websocket':
                return this.handleFrontendWebsocket();
            case '/__rome__/script.js':
                return this.handleFrontendScript();
            case '/__rome__': {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(string_utils_1.dedent `
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Rome</title>
                <link rel="stylesheet" href="https://meyerweb.com/eric/tools/css/reset/reset.css">
              </head>
              <body>
                <div id="app"></div>
                <script src="/__rome__/script.js"></script>
              </body>
            </html>
          `);
                break;
            }
            case '/hot':
                return this.handleDeviceWebsocket();
            default:
                return this.handleWildcard(pathname);
        }
    }
    async handleWildcard(pathname) {
        const { req, res } = this;
        // Check for *.bundle
        if (pathname.endsWith('.bundle')) {
            const handled = await this.handleBundleRequest();
            if (handled) {
                return;
            }
        }
        // Look up static file
        const project = await this.masterRequest.assertClientCwdProject();
        if (project.config.develop.serveStatic) {
            const handled = await this.handlePossibleStatic(pathname, project);
            if (handled) {
                return;
            }
        }
        this.reporter.error(`Unknown request for`, req.url);
        res.writeHead(404);
        res.end('Not found');
    }
    async handlePossibleStatic(pathname, project) {
        project;
        const possibleStaticPath = await this.server.pathnameToAbsolutePath(pathname);
        // TODO check if it is a file
        if (possibleStaticPath !== undefined &&
            (await this.master.memoryFs.existsHard(possibleStaticPath))) {
            return true;
        }
        return false;
    }
    async handleFrontendScript() {
        const { res } = this;
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        const bundler = new Bundler_1.default(this.masterRequest, {
            inlineSourceMap: false,
            cwd: this.masterRequest.client.flags.cwd,
            resolver: {
                platform: 'web',
            },
        });
        const resolved = await this.master.resolver.resolveEntryAssertPath({
            origin: this.masterRequest.client.flags.cwd,
            source: path_1.createUnknownFilePath('@romejs-web/frontend'),
        });
        const bundle = await bundler.bundle(resolved);
        res.end(bundle.entry.js);
    }
    negotiateWebsocket() {
        const { req } = this;
        const digest = codec_websocket_1.createKey(String(req.headers['sec-websocket-key']));
        const headers = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Protocol: rome',
            `Sec-WebSocket-Accept: ${digest}`,
            '',
            '',
        ];
        req.socket.write(headers.join('\r\n'));
    }
    async handleDeviceWebsocketMessage(socket, data) {
        switch (data.type) {
            case 'log':
                return this.server.printConsoleLog(data);
            case 'log-opt-in':
                // ???
                return;
            case 'register-entrypoints':
                /// ???
                return;
            default:
                console.log('UNKNOWN MESSAGE', data);
        }
    }
    async handleDeviceWebsocket() {
        const { req } = this;
        this.negotiateWebsocket();
        const socket = new codec_websocket_1.WebSocketInterface('server', req.socket);
        this.server.deviceWebsockets.add(socket);
        req.socket.on('error', (err) => {
            console.log(err.stack);
        });
        this.reporter.success(`Device websocket client connected`);
        socket.completeFrameEvent.subscribe((frame) => {
            const text = frame.payload.toString();
            try {
                const json = JSON.parse(text);
                this.handleDeviceWebsocketMessage(socket, json);
            }
            catch (err) {
                if (err instanceof SyntaxError) {
                    console.log('UNKNOWN FRAME', text);
                    return;
                }
                else {
                    throw err;
                }
            }
        });
        socket.errorEvent.subscribe((err) => {
            console.log(err);
        });
        socket.endEvent.subscribe(() => {
            console.log('END');
            this.server.deviceWebsockets.delete(socket);
        });
        await waitForever;
    }
    async handleFrontendWebsocket() {
        const { req } = this;
        this.negotiateWebsocket();
        const socket = new codec_websocket_1.WebSocketInterface('server', req.socket);
        const bridge = events_1.createBridgeFromWebSocketInterface(core_1.WebBridge, socket, {
            type: 'client',
        });
        this.server.frontendWebsocketBridges.add(bridge);
        req.socket.on('close', () => {
            this.server.frontendWebsocketBridges.delete(bridge);
        });
        await bridge.handshake();
        this.reporter.success('Frontend websocket client connected');
        this.server.sendRequests(bridge);
        await waitForever;
    }
    async handleBundleRequest() {
        const { res } = this;
        const { bundler, path } = await this.server.getBundler(this.url);
        const bundle = await bundler.bundle(path);
        const content = bundle.entry.js.content;
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(content);
        return true;
    }
}
exports.default = WebRequest;
