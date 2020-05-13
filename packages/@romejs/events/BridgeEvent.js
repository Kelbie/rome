"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BridgeError_1 = require("./BridgeError");
const Event_1 = require("./Event");
function validateDirection(
// rome-ignore lint/noExplicitAny
event, invalidDirections, verb) {
    invalidDirections.push(['server<->client', 'server&client']);
    for (const [eventDirection, bridgeType] of invalidDirections) {
        if (event.direction === eventDirection && event.bridge.type === bridgeType) {
            throw new Error(`The ${eventDirection} event "${event.name}" cannot be ${verb} by a ${bridgeType} bridge`);
        }
    }
}
class BridgeEvent extends Event_1.default {
    constructor(opts, bridge) {
        super(opts);
        this.bridge = bridge;
        this.requestCallbacks = new Map();
        this.direction = opts.direction;
    }
    clear() {
        super.clear();
        this.requestCallbacks.clear();
    }
    end(err) {
        for (const { reject } of this.requestCallbacks.values()) {
            reject(err);
        }
    }
    onSubscriptionChange() {
        validateDirection(this, [['server->client', 'client'], ['server<-client', 'server']], 'subscribed');
        this.bridge.sendSubscriptions();
    }
    dispatchRequest(param) {
        return super.call(param);
    }
    dispatchResponse(id, data) {
        const callbacks = this.requestCallbacks.get(id);
        if (!callbacks) {
            // ???
            return;
        }
        this.requestCallbacks.delete(id);
        if (data.responseStatus === 'success') {
            // @ts-ignore
            callbacks.resolve(data.value);
        }
        else if (data.responseStatus === 'error') {
            try {
                callbacks.reject(this.bridge.buildError(data.value, data.metadata));
            }
            catch (err) {
                callbacks.reject(err);
            }
        }
        else {
            // ???
        }
        if (callbacks.completed !== undefined) {
            callbacks.completed();
        }
    }
    hasSubscribers() {
        return this.bridge.listeners.has(this.name);
    }
    validateCanSend() {
        validateDirection(this, [['server<-client', 'client'], ['server->client', 'server']], 'called');
    }
    send(param) {
        if (!this.hasSubscribers()) {
            // No point in sending over a subscription that doesn't have a listener
            return;
        }
        this.validateCanSend();
        this.bridge.assertAlive();
        this.bridge.sendMessage({
            type: 'request',
            event: this.name,
            param,
            priority: false,
        });
    }
    async call(param, opts = {}) {
        const { priority = false, timeout } = opts;
        this.validateCanSend();
        try {
            return await new Promise((resolve, reject) => {
                this.bridge.assertAlive();
                const id = this.bridge.getNextMessageId();
                let completed;
                if (timeout !== undefined) {
                    const timeoutId = setTimeout(() => {
                        // Remove the request callback
                        this.requestCallbacks.delete(id);
                        // Reject the promise
                        reject(new BridgeError_1.default(`Timeout of ${String(timeout)}ms for ${this.name}(${String(JSON.stringify(param))}) event exceeded`, this.bridge));
                    }, timeout);
                    // Cancel the timeout if the response returns before the timer
                    completed = () => {
                        clearTimeout(timeoutId);
                    };
                }
                this.requestCallbacks.set(id, {
                    completed,
                    reject,
                    resolve,
                });
                this.bridge.sendMessage({
                    id,
                    event: this.name,
                    param,
                    type: 'request',
                    priority,
                });
            });
        }
        catch (err) {
            this.onError(err);
            throw err;
        }
    }
}
exports.default = BridgeEvent;
