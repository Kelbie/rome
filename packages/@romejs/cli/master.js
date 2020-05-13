"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@romejs/core");
const events_1 = require("@romejs/events");
const setProcessTitle_1 = require("./utils/setProcessTitle");
const net = require("net");
const fs_1 = require("@romejs/fs");
async function master() {
    setProcessTitle_1.default('master');
    const master = new core_1.Master({
        dedicated: true,
        globalErrorHandlers: true,
    });
    await master.init();
    const socketServer = net.createServer(function (socket) {
        const client = events_1.createBridgeFromSocket(core_1.MasterBridge, socket, {
            type: 'client',
        });
        master.attachToBridge(client);
    });
    if (await fs_1.exists(core_1.SOCKET_PATH)) {
        await fs_1.unlink(core_1.SOCKET_PATH);
    }
    socketServer.listen(core_1.SOCKET_PATH.join(), () => {
        const socket = net.createConnection(core_1.CLI_SOCKET_PATH.join(), () => {
            socket.end();
        });
        socket.on('error', (err) => {
            // Socket error occured, cli could have died before it caught us
            err;
            console.log(err);
            process.exit();
        });
    });
}
exports.default = master;
