"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Bundler_1 = require("../bundler/Bundler");
const pretty_format_1 = require("@romejs/pretty-format");
const http = require("http");
const string_markup_1 = require("@romejs/string-markup");
const WebRequest_1 = require("./WebRequest");
const platform_1 = require("../../common/types/platform");
class WebServer {
    constructor(req) {
        const { master } = req;
        this.masterRequest = req;
        this.reporter = req.reporter;
        this.master = master;
        this.bundlerCache = new Map();
        this.savingRequests = false;
        this.clientRequestHistory = new Map();
        this.clientHistory = new Map();
        this.deviceWebsockets = new Set();
        this.frontendWebsocketBridges = new Set();
        this.server = http.createServer((req, res) => {
            const webRequest = new WebRequest_1.default(this, req, res);
            webRequest.dispatch();
        });
        master.clientStartEvent.subscribe((client) => {
            if (!this.savingRequests) {
                return;
            }
            const data = {
                id: client.id,
                flags: {
                    ...client.flags,
                    cwd: client.flags.cwd.join(),
                },
                startTime: Date.now(),
                endTime: undefined,
                stdoutAnsi: '',
                stdoutHTML: '',
            };
            this.clientHistory.set(client.id, data);
            this.refreshRequests();
            const ansiReporterStream = {
                type: 'all',
                format: 'ansi',
                columns: 100,
                unicode: true,
                write(chunk) {
                    data.stdoutAnsi += chunk;
                },
            };
            const htmlReporterStream = {
                type: 'all',
                format: 'html',
                columns: 100,
                unicode: true,
                write(chunk) {
                    data.stdoutHTML += chunk;
                },
            };
            client.reporter.addStream(ansiReporterStream);
            master.connectedReporters.addStream(ansiReporterStream);
            client.reporter.addStream(htmlReporterStream);
            master.connectedReporters.addStream(htmlReporterStream);
            client.bridge.endEvent.subscribe(() => {
                master.connectedReporters.removeStream(ansiReporterStream);
                master.connectedReporters.removeStream(htmlReporterStream);
                data.endTime = Date.now();
                this.refreshRequests();
            });
        });
        master.requestStartEvent.subscribe((request) => {
            if (!this.savingRequests) {
                return;
            }
            const data = {
                id: request.id,
                client: request.client.id,
                query: request.query,
                markers: [],
                response: undefined,
                startTime: Date.now(),
                endTime: undefined,
            };
            this.clientRequestHistory.set(request.id, data);
            this.refreshRequests();
            request.markerEvent.subscribe((marker) => {
                data.markers.push(marker);
                this.refreshRequests();
            });
            request.endEvent.subscribe((response) => {
                // Update completion fields
                data.response = response;
                data.endTime = Date.now();
                this.refreshRequests();
            });
        });
    }
    sendRequests(bridge) {
        bridge.requests.send({
            requests: Array.from(this.clientRequestHistory.values()),
            clients: Array.from(this.clientHistory.values()),
        });
    }
    refreshRequests() {
        for (const bridge of this.frontendWebsocketBridges) {
            this.sendRequests(bridge);
        }
    }
    close() {
        this.server.close();
    }
    listen(port) {
        this.server.listen(port);
        //this.reporter.clear();
        const url = `http://localhost:${String(port)}`;
        this.reporter.success(`Listening on <hyperlink emphasis>${url}</hyperlink>`);
        this.reporter.info(`Web console available at <hyperlink emphasis>${url}/__rome__</hyperlink>`);
    }
    printConsoleLog(msg) {
        const { reporter } = this.masterRequest;
        let buf = msg.data.map((arg) => {
            if (typeof arg === 'string') {
                return string_markup_1.escapeMarkup(arg);
            }
            else {
                return pretty_format_1.default(arg, { markup: true });
            }
        }).join(' ');
        switch (msg.level) {
            case 'info': {
                reporter.info(buf);
                break;
            }
            case 'warn': {
                reporter.warn(buf);
                break;
            }
            case 'log':
            case 'trace': {
                reporter.verboseForce(buf);
                break;
            }
            case 'group':
            case 'groupCollapsed':
            case 'groupEnd':
                reporter.logAll('TODO');
        }
    }
    async pathnameToAbsolutePath(pathname) {
        const project = await this.masterRequest.assertClientCwdProject();
        const possibleStaticPath = project.folder.append(pathname);
        // This check makes sure that files outside of the project directory cannot be served
        if (possibleStaticPath.isRelativeTo(project.folder)) {
            return possibleStaticPath;
        }
        else {
            return undefined;
        }
    }
    sendToAllDeviceWebsockets(msg) {
        const text = JSON.stringify(msg);
        for (const socket of this.deviceWebsockets) {
            socket.send(text);
        }
    }
    async getBundler(url) {
        const pathname = WebRequest_1.stripBundleSuffix(String(url.path.asString()));
        const absolute = await this.pathnameToAbsolutePath(pathname);
        if (absolute === undefined) {
            throw new Error('Pathname is attempting to escalate out of cwd');
        }
        const pathPointer = url.path.getDiagnosticLocation();
        const path = await this.master.resolver.resolveEntryAssertPath({
            origin: this.masterRequest.client.flags.cwd,
            source: absolute,
        }, pathPointer === undefined ? undefined : { location: pathPointer });
        const platform = url.query.get('platform').asStringSetOrVoid(platform_1.PLATFORMS);
        const cacheKey = JSON.stringify({
            platform,
        });
        const cached = this.bundlerCache.get(cacheKey);
        if (cached !== undefined) {
            return { bundler: cached, path };
        }
        const bundlerConfig = this.masterRequest.getBundlerConfigFromFlags({
            platform,
        });
        const bundler = new Bundler_1.default(this.masterRequest, bundlerConfig);
        this.bundlerCache.set(cacheKey, bundler);
        return { bundler, path };
    }
}
exports.WebServer = WebServer;
