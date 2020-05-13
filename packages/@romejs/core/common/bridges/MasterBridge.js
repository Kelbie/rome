"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("@romejs/events");
class MasterBridge extends events_1.Bridge {
    constructor() {
        super(...arguments);
        this.getClientInfo = this.createEvent({
            name: 'getClientInfo',
            direction: 'server->client',
        });
        this.stdout = this.createEvent({
            name: 'stdout',
            direction: 'server->client',
        });
        this.stderr = this.createEvent({
            name: 'stderr',
            direction: 'server->client',
        });
        this.enableWorkerLogs = this.createEvent({
            name: 'enableWorkerLogs',
            direction: 'server<-client',
        });
        this.log = this.createEvent({
            name: 'log',
            direction: 'server->client',
        });
        this.setColumns = this.createEvent({
            name: 'columns.set',
            direction: 'server<-client',
        });
        this.reporterRemoteServerMessage = this.createEvent({
            name: 'reporterRemoteToLocalMessage',
            direction: 'server->client',
        });
        this.reporterRemoteClientMessage = this.createEvent({
            name: 'reporterLocalToRemoteMessage',
            direction: 'server<-client',
        });
        this.query = this.createEvent({
            name: 'query',
            direction: 'server<-client',
        });
        this.cancelQuery = this.createEvent({
            name: 'cancel',
            direction: 'server<-client',
        });
        this.profilingGetWorkers = this.createEvent({
            name: 'profiling.getWorkers',
            direction: 'server<-client',
        });
        this.profilingStart = this.createEvent({
            name: 'profiling.start',
            direction: 'server<-client',
        });
        this.profilingStop = this.createEvent({
            name: 'profiling.stop',
            direction: 'server<-client',
        });
        this.profilingStopWorker = this.createEvent({
            name: 'profile.stopWorker',
            direction: 'server<-client',
        });
        this.lspFromClientBuffer = this.createEvent({
            name: 'lspFromClientBuffer',
            direction: 'server<-client',
        });
        this.lspFromServerBuffer = this.createEvent({
            name: 'lspFromServerBuffer',
            direction: 'server->client',
        });
    }
}
exports.default = MasterBridge;
