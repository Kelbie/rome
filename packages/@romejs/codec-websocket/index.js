"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const frame_1 = require("./frame");
const events_1 = require("@romejs/events");
const crypto = require("crypto");
const url = require("url");
const http = require("http");
function createKey(key) {
    return crypto.createHash('sha1').update(`${key}${types_1.GUID}`).digest('base64');
}
exports.createKey = createKey;
class WebSocketInterface {
    constructor(type, socket, reporter) {
        // When a frame is set here then any additional continuation frames payloads will be appended
        this.unfinishedFrame = undefined;
        // When a frame is set here, all additional chunks will be appended until we reach the correct payloadLength
        this.incompleteFrame = undefined;
        this.reporter = reporter;
        this.socket = socket;
        this.alive = true;
        this.type = type;
        this.completeFrameEvent = new events_1.Event({ name: 'WebSocketInterface.message' });
        this.errorEvent = new events_1.Event({ name: 'WebSocketInterface.error' });
        this.endEvent = new events_1.Event({ name: 'WebSocketInterface.end', serial: true });
        socket.on('data', (buff) => {
            this.addBuffer(buff);
        });
        socket.on('error', (err) => {
            if (err.code === 'ECONNRESET') {
                this.endEvent.send();
            }
            else {
                this.errorEvent.send(err);
            }
        });
        socket.on('close', () => {
            this.end();
        });
    }
    end() {
        if (!this.alive) {
            return;
        }
        this.alive = false;
        this.endEvent.send();
        this.socket.end();
    }
    send(buff) {
        if (typeof buff === 'string') {
            this.sendFrame({
                opcode: types_1.OPCODES.TEXT,
                fin: true,
                data: Buffer.from(buff),
            });
        }
        else if (buff instanceof Buffer) {
            this.sendFrame({
                opcode: types_1.OPCODES.BINARY,
                fin: true,
                data: buff,
            });
        }
        else {
            throw new Error("Don't know how to send this");
        }
    }
    sendJSON(val) {
        this.send(String(JSON.stringify(val)));
    }
    sendFrame(frameOpts) {
        if (this.reporter !== undefined) {
            this.reporter.info('Sending frame', {
                fin: frameOpts.fin,
                opcode: frameOpts.opcode,
                msg: frameOpts.data,
            });
        }
        this.socket.write(frame_1.buildFrame(frameOpts, this.type === 'client'));
    }
    completeFrame(frame) {
        // If we have an unfinished frame then only allow continuations
        const { unfinishedFrame } = this;
        if (unfinishedFrame !== undefined) {
            if (frame.opcode === types_1.OPCODES.CONTINUATION) {
                unfinishedFrame.payload = Buffer.concat([
                    unfinishedFrame.payload,
                    frame_1.unmaskPayload(frame.payload, unfinishedFrame.mask, unfinishedFrame.payload.length),
                ]);
                if (frame.fin) {
                    this.unfinishedFrame = undefined;
                    this.completeFrame(unfinishedFrame);
                }
                return;
            }
            else {
                // Silently ignore the previous frame...
                this.unfinishedFrame = undefined;
                /*throw new Error(
                  `We're waiting for a frame to finish so only allow continuation frames. Received frame: ${JSON.stringify(
                    frame,
                  )} Unfinished frame: ${JSON.stringify(unfinishedFrame)}`,
                );*/
            }
        }
        if (frame.fin) {
            if (frame.opcode === types_1.OPCODES.PING) {
                this.sendFrame({
                    opcode: types_1.OPCODES.PONG,
                    fin: true,
                    data: frame.payload,
                });
            }
            else {
                // Trim off any excess payload
                let excess;
                if (frame.payload.length > frame.payloadLength) {
                    excess = frame.payload.slice(frame.payloadLength);
                    frame.payload = frame.payload.slice(0, frame.payloadLength);
                }
                if (this.reporter !== undefined) {
                    this.reporter.info('Received complete frame', {
                        opcode: frame.opcode,
                        length: frame.payloadLength,
                        msg: frame.payload,
                    });
                }
                this.completeFrameEvent.send(frame);
                if (excess !== undefined) {
                    this.addBuffer(excess);
                }
            }
        }
        else {
            this.unfinishedFrame = frame;
        }
    }
    addBufferToIncompleteFrame(incompleteFrame, buff) {
        incompleteFrame.payload = Buffer.concat([
            incompleteFrame.payload,
            frame_1.unmaskPayload(buff, incompleteFrame.mask, incompleteFrame.payload.length),
        ]);
        if (frame_1.isCompleteFrame(incompleteFrame)) {
            this.incompleteFrame = undefined;
            this.completeFrame(incompleteFrame);
        }
    }
    addBuffer(buff) {
        // Check if we're still waiting for the rest of a payload
        const { incompleteFrame } = this;
        if (incompleteFrame !== undefined) {
            this.addBufferToIncompleteFrame(incompleteFrame, buff);
            return;
        }
        const frame = frame_1.parseFrame(buff);
        if (frame_1.isCompleteFrame(frame)) {
            // Frame has been completed!
            this.completeFrame(frame);
        }
        else {
            this.incompleteFrame = frame;
        }
    }
}
exports.WebSocketInterface = WebSocketInterface;
async function createClient(rawUrl) {
    const parts = url.parse(rawUrl);
    return new Promise((resolve, reject) => {
        const key = crypto.randomBytes(16).toString('base64');
        const digest = createKey(key);
        const req = http.request({
            hostname: parts.hostname,
            port: parts.port,
            path: parts.path,
            method: 'GET',
            headers: {
                Connection: 'Upgrade',
                Upgrade: 'websocket',
                'Sec-WebSocket-Key': key,
                'Sec-WebSocket-Version': '13',
            },
        });
        req.on('response', (res) => {
            if (res.statusCode && res.statusCode >= 400) {
                process.stderr.write(`Unexpected HTTP code: ${res.statusCode}\n`);
                res.pipe(process.stderr);
            }
            else {
                res.pipe(process.stderr);
            }
        });
        req.on('upgrade', (res, socket, head) => {
            if (res.headers['sec-websocket-accept'] !== digest) {
                socket.end();
                reject(new Error(`Digest mismatch ${digest} !== ${res.headers['sec-websocket-accept']}`));
                return;
            }
            const client = new WebSocketInterface('client', socket);
            //client.addBuffer(head);
            head;
            resolve(client);
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.end();
    });
}
exports.createClient = createClient;
