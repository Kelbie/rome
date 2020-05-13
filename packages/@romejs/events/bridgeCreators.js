"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pretty_format_1 = require("@romejs/pretty-format");
const SOCKET_LENGTH = /^(\d+):/;
// JSON.stringify but throw on bad data types
// Most likely slower... But safer and our data structures are usually fairly shallow
function stringify(obj) {
    return JSON.stringify(obj, (key, value) => {
        const type = typeof value;
        if (value === undefined || value === null) {
            return value;
        }
        // Primitives
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return value;
        }
        // Arrays and plain objects
        if (Array.isArray(value) || value.constructor === Object) {
            return value;
        }
        throw new Error(`Illegal data type not allowed in JSON: ${pretty_format_1.default(value)} in ${pretty_format_1.default(obj)}`);
    });
}
function createBridgeFromWebSocketInterface(CustomBridge, inf, opts) {
    const bridge = new CustomBridge({
        ...opts,
        sendMessage: (data) => {
            inf.sendJSON(data);
        },
    });
    const { socket } = inf;
    bridge.endEvent.subscribe(() => {
        socket.end();
    });
    inf.completeFrameEvent.subscribe((frame) => {
        const json = frame.payload.toString();
        bridge.handleJSONMessage(json);
    });
    socket.on('error', (err) => {
        bridge.endWithError(err);
    });
    socket.on('end', () => {
        bridge.end('RPC WebSocket died');
    });
    return bridge;
}
exports.createBridgeFromWebSocketInterface = createBridgeFromWebSocketInterface;
function createBridgeFromBrowserWebSocket(CustomBridge, socket, opts) {
    const bridge = new CustomBridge({
        ...opts,
        sendMessage: (data) => {
            socket.send(stringify(data));
        },
    });
    bridge.endEvent.subscribe(() => {
        socket.close();
    });
    socket.onmessage = function (event) {
        bridge.handleJSONMessage(String(event.data));
    };
    socket.onclose = () => {
        bridge.end('RPC WebSocket disconnected');
    };
    return bridge;
}
exports.createBridgeFromBrowserWebSocket = createBridgeFromBrowserWebSocket;
function createBridgeFromSocket(CustomBridge, socket, opts) {
    const bridge = new CustomBridge({
        ...opts,
        sendMessage: (data) => {
            const serialized = stringify(data);
            socket.write(`${serialized.length}:${serialized}`);
        },
    });
    bridge.endEvent.subscribe(() => {
        socket.end();
    });
    // buffer data and parse message on newline
    let buff = '';
    let messageLength = 0;
    socket.setEncoding('utf8');
    function checkForPossibleMessage() {
        // we're awaiting a message and have received it
        if (messageLength > 0 && buff.length >= messageLength) {
            // retrieve the message from the buffer
            const msg = buff.slice(0, messageLength);
            // clear the next message length and remove the current message from the buffer
            buff = buff.slice(messageLength);
            messageLength = 0;
            // parse it
            bridge.handleJSONMessage(msg);
        }
        // if we aren't waiting for a message and we have a buffer then check for an incoming message
        if (messageLength === 0 && buff !== '') {
            // check if we've received the starting info of a message
            const possibleLength = buff.match(SOCKET_LENGTH);
            if (possibleLength != null) {
                // get the message length
                messageLength = Number(possibleLength[1]);
                // remove the length designator
                buff = buff.slice(possibleLength[0].length);
                // check if we have a full message
                checkForPossibleMessage();
            }
        }
    }
    socket.on('data', (chunk) => {
        buff += chunk;
        checkForPossibleMessage();
    });
    socket.on('error', (err) => {
        bridge.endWithError(err);
    });
    socket.on('end', () => {
        bridge.end('Socket disconnected');
    });
    return bridge;
}
exports.createBridgeFromSocket = createBridgeFromSocket;
function createBridgeFromLocal(CustomBridge, opts) {
    const bridge = new CustomBridge({
        ...opts,
        type: 'server&client',
        sendMessage: (msg) => {
            bridge.handleMessage(msg);
        },
    });
    return bridge;
}
exports.createBridgeFromLocal = createBridgeFromLocal;
function createBridgeFromChildProcess(CustomBridge, proc, opts) {
    const bridge = new CustomBridge({
        ...opts,
        sendMessage: (data) => {
            proc.send(data);
        },
    });
    bridge.endEvent.subscribe(() => {
        proc.kill();
    });
    proc.on('error', (err) => {
        bridge.endWithError(err);
    });
    proc.on('message', (msg) => {
        bridge.handleMessage(msg);
    });
    // Catch process dying and reject any requests in flight
    proc.on('close', () => {
        bridge.end('RPC child process died');
    });
    return bridge;
}
exports.createBridgeFromChildProcess = createBridgeFromChildProcess;
function createBridgeFromParentProcess(CustomBridge, opts) {
    const bridge = new CustomBridge({
        ...opts,
        sendMessage: (data) => {
            if (typeof process.send === 'function') {
                process.send(data);
            }
            else {
                throw new Error('No process.send found');
            }
        },
    });
    process.on('message', (data) => {
        bridge.handleMessage(data);
    });
    // I doubt any of these will have time to dispatch but for consistency sake...
    process.on('exit', () => {
        bridge.end('RPC self process died');
    });
    return bridge;
}
exports.createBridgeFromParentProcess = createBridgeFromParentProcess;
