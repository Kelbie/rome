"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const inspector = require("inspector");
class Profiler {
    constructor() {
        this.session = undefined;
        this.memoryInterval = undefined;
        this.memorySamples = [];
    }
    async startProfiling(samplingInterval) {
        this.session = new inspector.Session();
        this.session.connect();
        this.memoryInterval = setInterval(() => {
            const time = utils_1.hrTime();
            const size = process.memoryUsage().heapUsed;
            this.memorySamples.push([time, size]);
        }, 100);
        await Promise.all([
            this.sendCommand('Profiler.setSamplingInterval', {
                interval: samplingInterval,
            }),
            this.sendCommand('Profiler.enable'),
            this.sendCommand('Profiler.start'),
        ]);
    }
    async sendCommand(method, params) {
        const { session } = this;
        if (session === undefined) {
            return Promise.reject(new Error('No current profiler session'));
        }
        else {
            return new Promise((resolve, reject) => {
                session.post(method, params, (err) => {
                    if (err === null) {
                        resolve();
                    }
                    else {
                        reject(err);
                    }
                });
            });
        }
    }
    destroy() {
        const { session } = this;
        if (session !== undefined) {
            if (this.memoryInterval !== undefined) {
                clearInterval(this.memoryInterval);
            }
            this.memorySamples = [];
            session.disconnect();
        }
    }
    async stopProfiling() {
        const { session } = this;
        if (session === undefined) {
            return Promise.reject(new Error('No current profiler session'));
        }
        const { memorySamples } = this;
        const res = await new Promise((resolve, reject) => {
            session.post('Profiler.stop', (err, params) => {
                if (err === null) {
                    resolve(params);
                }
                else {
                    reject(err);
                }
            });
        });
        this.destroy();
        return {
            pid: process.pid,
            cpuProfile: res.profile,
            memorySamples,
        };
    }
}
exports.default = Profiler;
