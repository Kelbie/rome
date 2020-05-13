"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function noPromise(ret) {
    if (ret instanceof Promise) {
        throw new Error('Subscription returned promise for a callSync');
    }
    else {
        return ret;
    }
}
class Event {
    constructor(opts) {
        this.subscriptions = new Set();
        this.rootSubscription = undefined;
        this.name = opts.name;
        this.options = opts;
    }
    onSubscriptionChange() {
        // Hook for BridgeEvent
    }
    onError(err) {
        const { onError } = this.options;
        if (onError !== undefined) {
            onError(err);
        }
    }
    clear() {
        this.subscriptions.clear();
    }
    hasSubscribers() {
        return this.hasSubscriptions();
    }
    hasSubscriptions() {
        return this.rootSubscription !== undefined;
    }
    // Dispatch the event without caring about the return values
    send(param) {
        const { rootSubscription } = this;
        if (rootSubscription === undefined) {
            return;
        }
        rootSubscription(param);
        for (const callback of this.subscriptions) {
            callback(param);
        }
    }
    callSync(param) {
        try {
            const { rootSubscription, subscriptions } = this;
            if (rootSubscription === undefined) {
                throw new Error(`No subscription for event ${this.name}`);
            }
            const ret = noPromise(rootSubscription(param));
            for (const callback of subscriptions) {
                noPromise(callback(param));
            }
            return ret;
        }
        catch (err) {
            this.onError(err);
            throw err;
        }
    }
    async call(param) {
        const { rootSubscription, subscriptions } = this;
        if (rootSubscription === undefined) {
            throw new Error(`No subscription for event ${this.name}`);
        }
        try {
            if (this.options.serial === true) {
                const ret = await rootSubscription(param);
                for (const callback of subscriptions) {
                    await callback(param);
                }
                return ret;
            }
            else {
                const res = await Promise.all([
                    rootSubscription(param),
                    ...Array.from(subscriptions, (callback) => callback(param)),
                ]);
                // Return the root subscription value
                return res[0];
            }
        }
        catch (err) {
            this.onError(err);
            throw err;
        }
    }
    wait(val, timeout) {
        return new Promise((resolve, reject) => {
            let timeoutId;
            let timedOut = false;
            if (timeout !== undefined) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    listener.unsubscribe();
                    reject(new Error(`Timed out after waiting ${timeout}ms for ${this.name}`));
                }, timeout);
            }
            const listener = this.subscribe((param) => {
                if (timedOut) {
                    return val;
                }
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                }
                listener.unsubscribe();
                resolve(param);
                return val;
            });
        });
    }
    async callOptional(param) {
        if (this.rootSubscription === undefined) {
            return undefined;
        }
        else {
            return this.call(param);
        }
    }
    subscribe(callback, makeRoot) {
        if (this.options.unique === true && this.subscriptions.size !== 0) {
            throw new Error(`Event ${this.name} only allows a single subscription`);
        }
        if (this.rootSubscription === callback || this.subscriptions.has(callback)) {
            throw new Error('Cannot double subscribe a callback');
        }
        if (this.rootSubscription === undefined) {
            this.rootSubscription = callback;
        }
        else if (makeRoot === true) {
            this.subscriptions.add(this.rootSubscription);
            this.rootSubscription = callback;
        }
        else {
            this.subscriptions.add(callback);
        }
        this.onSubscriptionChange();
        return {
            unsubscribe: () => {
                this.unsubscribe(callback);
            },
        };
    }
    unsubscribe(callback) {
        if (this.subscriptions.has(callback)) {
            this.subscriptions.delete(callback);
            this.onSubscriptionChange();
            return;
        }
        // If this callback was the root subscription, then set it to the next one
        if (callback === this.rootSubscription) {
            this.rootSubscription = Array.from(this.subscriptions)[0];
            this.onSubscriptionChange();
            return;
        }
    }
}
exports.default = Event;
