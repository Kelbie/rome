"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("@romejs/events");
class TestWorkerBridge extends events_1.Bridge {
    constructor() {
        super(...arguments);
        this.inspectorDetails = this.createEvent({
            name: 'inspectorDetails',
            direction: 'server->client',
        });
        this.prepareTest = this.createEvent({
            name: 'prepareTest',
            direction: 'server->client',
        });
        this.runTest = this.createEvent({
            name: 'runTest',
            direction: 'server->client',
        });
        this.testsFound = this.createEvent({
            name: 'onTestFounds',
            direction: 'server<-client',
        });
        this.testStart = this.createEvent({
            name: 'onTestStart',
            direction: 'server<-client',
        });
        this.testDiagnostic = this.createEvent({
            name: 'testDiagnostic',
            direction: 'server<-client',
        });
        this.testFinish = this.createEvent({
            name: 'onTestSuccess',
            direction: 'server<-client',
        });
    }
}
exports.default = TestWorkerBridge;
