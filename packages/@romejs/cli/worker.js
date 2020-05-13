"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const setProcessTitle_1 = require("./utils/setProcessTitle");
const events_1 = require("@romejs/events");
const core_1 = require("@romejs/core");
async function worker() {
    setProcessTitle_1.default('worker');
    const bridge = events_1.createBridgeFromParentProcess(core_1.WorkerBridge, {
        type: 'server',
    });
    const worker = new core_1.Worker({
        bridge,
        globalErrorHandlers: true,
    });
    await worker.init();
    bridge.handshake();
}
exports.default = worker;
