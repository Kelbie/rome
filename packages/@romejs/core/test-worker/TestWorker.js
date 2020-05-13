"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const core_1 = require("@romejs/core");
const events_1 = require("@romejs/events");
const TestWorkerRunner_1 = require("./TestWorkerRunner");
const inspector = require("inspector");
class TestWorker {
    constructor() {
        this.bridge = this.buildBridge();
        this.runners = new Map();
    }
    async init(flags) {
        inspector.open(flags.inspectorPort);
        await this.bridge.handshake();
    }
    buildBridge() {
        const bridge = events_1.createBridgeFromParentProcess(core_1.TestWorkerBridge, {
            type: 'server',
        });
        process.on('unhandledRejection', (err) => {
            bridge.testDiagnostic.send({
                origin: undefined,
                diagnostic: diagnostics_1.deriveDiagnosticFromError(err, {
                    description: {
                        category: 'tests/unhandledRejection',
                    },
                }),
            });
        });
        bridge.inspectorDetails.subscribe(() => {
            return {
                inspectorUrl: inspector.url(),
            };
        });
        bridge.prepareTest.subscribe((data) => {
            return this.prepareTest(data);
        });
        bridge.runTest.subscribe((opts) => {
            return this.runTest(opts);
        });
        return bridge;
    }
    async runTest(opts) {
        const { id } = opts;
        const runner = this.runners.get(id);
        if (runner === undefined) {
            throw new Error(`No runner ${id} found`);
        }
        else {
            return await runner.run(opts);
        }
    }
    async prepareTest(opts) {
        const runner = new TestWorkerRunner_1.default(opts, this.bridge);
        this.runners.set(opts.id, runner);
        return await runner.prepare();
    }
}
exports.default = TestWorker;
