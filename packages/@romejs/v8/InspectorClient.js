"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_json_1 = require("@romejs/codec-json");
class InspectorClientCloseError extends Error {
    constructor() {
        super('Inspector connection closed');
    }
}
exports.InspectorClientCloseError = InspectorClientCloseError;
class InspectorClient {
    constructor(socket) {
        this.socket = socket;
        this.id = 0;
        this.subscriptions = new Map();
        this.callbacks = new Map();
        this.alive = true;
        this.init();
    }
    end() {
        this.socket.end();
    }
    init() {
        const { socket } = this;
        socket.errorEvent.subscribe((err) => {
            this.alive = false;
            for (const [, { reject }] of this.callbacks) {
                reject(err);
            }
            this.callbacks.clear();
            this.end();
        });
        socket.endEvent.subscribe(() => {
            this.alive = false;
            for (const [, { reject }] of this.callbacks) {
                reject(new InspectorClientCloseError());
            }
            this.callbacks.clear();
        });
        socket.completeFrameEvent.subscribe((frame) => {
            const json = frame.payload.toString();
            const data = codec_json_1.consumeJSON({
                input: json,
            });
            // Message reply
            const id = data.get('id').asNumberOrVoid();
            if (id !== undefined) {
                const handler = this.callbacks.get(id);
                if (handler !== undefined) {
                    if (data.has('error')) {
                        const errorMessage = data.get('error').get('message').asString();
                        handler.reject(new Error(errorMessage));
                    }
                    else {
                        handler.resolve(data.get('result'));
                    }
                    this.callbacks.delete(id);
                }
                return;
            }
            // Event
            const method = data.get('method').asStringOrVoid();
            if (method !== undefined) {
                const subs = this.subscriptions.get(method);
                if (subs !== undefined) {
                    for (const sub of subs) {
                        const { callback, once } = sub;
                        callback(data.get('params'));
                        if (once) {
                            subs.delete(sub);
                        }
                    }
                }
            }
        });
    }
    subscribe(method, sub) {
        let subs = this.subscriptions.get(method);
        if (subs === undefined) {
            subs = new Set();
            this.subscriptions.set(method, subs);
        }
        subs.add(sub);
    }
    assertAlive() {
        if (!this.alive) {
            throw new Error('InspectorClient has no active socket');
        }
    }
    async wait(method) {
        return new Promise((resolve) => {
            this.assertAlive();
            this.subscribe(method, {
                once: true,
                callback: resolve,
            });
        });
    }
    call(method, params) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.assertAlive();
            this.callbacks.set(id, { resolve, reject });
            this.socket.sendJSON({
                id,
                method,
                params,
            });
        });
    }
}
exports.default = InspectorClient;
