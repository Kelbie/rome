"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const BridgeError_1 = require("./BridgeError");
const BridgeEvent_1 = require("./BridgeEvent");
const Event_1 = require("./Event");
const v8_1 = require("@romejs/v8");
class Bridge {
    constructor(opts) {
        this.errorTransports = new Map();
        this.alive = true;
        this.type = opts.type;
        this.opts = opts;
        this.messageIdCounter = 0;
        this.events = new Map();
        this.hasHandshook = false;
        this.handshakeEvent = new Event_1.default({ name: 'Bridge.handshake' });
        this.endEvent = new Event_1.default({ name: 'Bridge.end', serial: true });
        this.updatedListenersEvent = new Event_1.default({
            name: 'Bridge.updatedListenersEvent',
        });
        // A Set of event names that are being listened to on the other end
        // We track this to avoid sending over subscriptions that aren't needed
        this.listeners = new Set();
        this.prioritizedResponses = new Set();
        this.deprioritizedResponseQueue = [];
        this.postHandshakeQueue = [];
        this.heartbeatEvent = this.createEvent({
            name: 'Bridge.heartbeat',
            direction: 'server<->client',
        });
        if (this.type !== 'server&client') {
            this.heartbeatEvent.subscribe(() => {
                return undefined;
            });
        }
        this.clear();
        this.init();
    }
    attachEndSubscriptionRemoval(subscription) {
        this.endEvent.subscribe(() => {
            subscription.unsubscribe();
        });
    }
    monitorHeartbeat(timeout, onExceeded) {
        if (this.type === 'server&client') {
            // No point in monitoring this since we're the same process
            return;
        }
        this.heartbeatTimeout = setTimeout(async () => {
            try {
                await this.heartbeatEvent.call(undefined, { timeout });
                this.monitorHeartbeat(timeout, onExceeded);
            }
            catch (err) {
                if (err instanceof BridgeError_1.default) {
                    if (this.alive) {
                        onExceeded();
                    }
                }
                else {
                    throw err;
                }
            }
        }, 1000);
    }
    clearPrioritization(id) {
        this.prioritizedResponses.delete(id);
        if (this.prioritizedResponses.size === 0) {
            for (const msg of this.deprioritizedResponseQueue) {
                this.sendMessage(msg);
            }
            this.deprioritizedResponseQueue = [];
        }
    }
    async handshake(opts = {}) {
        if (this.hasHandshook) {
            throw new Error('Already performed handshake');
        }
        const { timeout, second = false } = opts;
        // Send a handshake in case we were the first
        if (!second) {
            this.sendMessage({
                type: 'handshake',
                first: true,
                subscriptions: this.getSubscriptions(),
            });
        }
        // Wait for a handshake from the other end
        const res = await this.handshakeEvent.wait(undefined, timeout);
        if (res.first) {
            // Send the handshake again, as it wouldn't have received the first
            this.sendMessage({
                type: 'handshake',
                first: false,
                subscriptions: this.getSubscriptions(),
            });
        }
        this.receivedSubscriptions(res.subscriptions);
        this.hasHandshook = true;
        for (const msg of this.postHandshakeQueue) {
            this.sendMessage(msg);
        }
        this.postHandshakeQueue = [];
    }
    getSubscriptions() {
        const names = [];
        for (const event of this.events.values()) {
            if (event.hasSubscriptions()) {
                names.push(event.name);
            }
        }
        return names;
    }
    sendSubscriptions() {
        if (!this.hasHandshook) {
            // If we haven't had the handshake then no point sending them. They'll be sent all at once after
            return;
        }
        // Notify the other side of what we're currently subscribed to
        // We send over a list of all of our subscriptions every time
        // This is fine since we don't change subscriptions often and they aren't very large
        // If we have a lot of subscriptions, or are changing them a lot in the future then this could be optimized
        this.sendMessage({
            type: 'subscriptions',
            names: this.getSubscriptions(),
        });
    }
    receivedSubscriptions(names) {
        this.listeners = new Set(names);
        this.updatedListenersEvent.send(this.listeners);
    }
    init() {
        // This method can be overridden by subclasses, it allows you to add logic such as error serializers
    }
    clear() {
        for (const [, event] of this.events) {
            event.clear();
        }
    }
    getNextMessageId() {
        return ++this.messageIdCounter;
    }
    createEvent(opts) {
        if (this.events.has(opts.name)) {
            throw new Error('Duplicate event');
        }
        const event = new BridgeEvent_1.default(opts, this);
        this.events.set(opts.name, event);
        return event;
    }
    //# Connection death
    assertAlive() {
        if (this.alive === false) {
            throw new Error('Bridge is dead');
        }
    }
    endWithError(err) {
        if (this.alive === false) {
            return;
        }
        this.alive = false;
        // Reject any pending requests
        for (const [, event] of this.events) {
            event.end(err);
        }
        this.clear();
        // Clear any currently processing heartbeat
        if (this.heartbeatTimeout !== undefined) {
            clearTimeout(this.heartbeatTimeout);
        }
        // Notify listeners
        this.endEvent.callSync(err);
    }
    end(message = 'Connection died') {
        this.endWithError(new BridgeError_1.default(message, this));
    }
    //# Error serialization
    buildError(struct, data) {
        const transport = this.errorTransports.get(struct.name);
        if (transport === undefined) {
            const err = new Error(struct.message);
            err.name = struct.name || 'Error';
            err.stack = struct.stack;
            err[v8_1.ERROR_FRAMES_PROP] = struct.frames;
            return err;
        }
        else {
            return transport.hydrate(struct, data);
        }
    }
    buildErrorResponse(id, event, errRaw) {
        // Just in case something that wasn't an Error was thrown
        const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
        // Fetch some metadata for hydration
        const tranport = this.errorTransports.get(err.name);
        const metadata = tranport === undefined ? {} : tranport.serialize(err);
        return {
            id,
            event,
            type: 'response',
            responseStatus: 'error',
            value: v8_1.getErrorStructure(err),
            metadata,
        };
    }
    addErrorTransport(name, transport) {
        this.errorTransports.set(name, transport);
    }
    //# Message transmission
    sendMessage(msg) {
        // There's no try-catch gated around sendMessage because the call stack here will include some other error handler
        // We need to be specific for handleMessage because it could come from anywhere
        if (msg.type !== 'handshake' && !this.hasHandshook) {
            this.postHandshakeQueue.push(msg);
            return;
        }
        this.assertAlive();
        if (msg.type === 'response') {
            if (this.prioritizedResponses.size > 0 &&
                !this.prioritizedResponses.has(msg.id)) {
                this.deprioritizedResponseQueue.push(msg);
                return;
            }
            if (this.prioritizedResponses.has(msg.id)) {
                this.clearPrioritization(msg.id);
            }
        }
        const { opts } = this;
        opts.sendMessage(msg);
        if (opts.onSendMessage !== undefined) {
            opts.onSendMessage(msg);
        }
    }
    handleJSONMessage(str) {
        try {
            const data = JSON.parse(str);
            this.handleMessage(data);
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                this.endWithError(new BridgeError_1.default(`Error parsing message JSON: ${err.message}`, this));
            }
            else {
                this.endWithError(err);
            }
        }
    }
    handleMessage(msg) {
        try {
            this.assertAlive();
            if (msg.type === 'handshake') {
                this.handshakeEvent.send({
                    subscriptions: msg.subscriptions,
                    first: msg.first,
                });
            }
            if (msg.type === 'subscriptions') {
                this.receivedSubscriptions(msg.names);
            }
            if (msg.type === 'request') {
                this.handleMessageRequest(msg);
            }
            if (msg.type === 'response') {
                this.handleMessageResponse(msg);
            }
        }
        catch (err) {
            this.endWithError(err);
        }
    }
    handleMessageResponse(data) {
        const { id, event } = data;
        if (id === undefined) {
            throw new Error('Expected id');
        }
        if (event === undefined) {
            throw new Error('Expected event');
        }
        const eventHandler = this.events.get(event);
        if (eventHandler === undefined) {
            throw new Error('Unknown event');
        }
        eventHandler.dispatchResponse(id, data);
    }
    handleMessageRequest(data) {
        const { id, event, param, priority } = data;
        if (event === undefined) {
            throw new Error('Expected event in message request but received none');
        }
        const eventHandler = this.events.get(event);
        if (eventHandler === undefined) {
            throw new Error(`Unknown event ${event}`);
        }
        if (id === undefined) {
            // We don't need to do anything with the return value of this since
            // there's nothing on the other end to catch it
            eventHandler.dispatchRequest(param);
        }
        else {
            if (priority) {
                this.prioritizedResponses.add(id);
            }
            eventHandler.dispatchRequest(param).then((value) => {
                this.sendMessage({
                    event,
                    id,
                    type: 'response',
                    responseStatus: 'success',
                    value,
                });
            }).catch((err) => {
                this.sendMessage(this.buildErrorResponse(id, event, err));
            }).catch((err) => this.endWithError(err));
        }
    }
}
exports.default = Bridge;
