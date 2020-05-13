"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const events_1 = require("@romejs/events");
class WorkerBridge extends events_1.Bridge {
    constructor() {
        super(...arguments);
        this.log = this.createEvent({
            name: 'log',
            direction: 'server->client',
        });
        this.updateProjects = this.createEvent({
            name: 'updateProjects',
            direction: 'server->client',
        });
        this.updateManifests = this.createEvent({
            name: 'updateManifests',
            direction: 'server->client',
        });
        this.profilingStart = this.createEvent({
            name: 'profiling.start',
            direction: 'server->client',
        });
        this.profilingStop = this.createEvent({
            name: 'profiling.stop',
            direction: 'server->client',
        });
        this.status = this.createEvent({
            name: 'status',
            direction: 'server->client',
        });
        this.evict = this.createEvent({
            name: 'evict',
            direction: 'server->client',
        });
        this.format = this.createEvent({
            name: 'format',
            direction: 'server->client',
        });
        this.moduleSignatureJS = this.createEvent({
            name: 'moduleSignatureJS',
            direction: 'server->client',
        });
        this.analyzeDependencies = this.createEvent({
            name: 'analyzeDependencies',
            direction: 'server->client',
        });
        this.lint = this.createEvent({ name: 'lint', direction: 'server->client' });
        this.updateInlineSnapshots = this.createEvent({ name: 'updateInlineSnapshots', direction: 'server->client' });
        this.compileJS = this.createEvent({ name: 'compileJS', direction: 'server->client' });
        this.parseJS = this.createEvent({ name: 'parseJS', direction: 'server->client' });
        this.updateBuffer = this.createEvent({
            name: 'updateBuffer',
            direction: 'server->client',
        });
    }
    init() {
        this.addErrorTransport('DiagnosticsError', {
            serialize(err) {
                if (!(err instanceof diagnostics_1.DiagnosticsError)) {
                    throw new Error('Expected DiagnosticsError');
                }
                return {
                    diagnostics: err.diagnostics,
                };
            },
            hydrate(err, data) {
                return new diagnostics_1.DiagnosticsError(String(err.message), 
                // rome-ignore lint/noExplicitAny
                data.diagnostics);
            },
        });
    }
}
exports.default = WorkerBridge;
