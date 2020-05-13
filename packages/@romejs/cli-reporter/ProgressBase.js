"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_PROGRESS_OPTIONS = {
    name: undefined,
    title: undefined,
    initDelay: undefined,
    elapsed: true,
    eta: true,
    persistent: false,
};
class ProgressBase {
    constructor(reporter, opts = {}) {
        this.total = undefined;
        this.reporter = reporter;
        this.current = 0;
        this.approximateTotal = false;
        this.approximateETA = undefined;
        this.textStack = [];
        this.text = undefined;
        this.title =
            opts.title === undefined ? undefined : reporter.stripMarkup(opts.title);
        this.paused = false;
        this.pausedStart = undefined;
        this.pausedElapsed = 0;
        this.opts = {
            ...DEFAULT_PROGRESS_OPTIONS,
            ...opts,
        };
    }
    setCurrent(current) {
        this.current = current;
        this.queueRender();
        // Progress complete
        if (this.total !== undefined &&
            this.current >= this.total &&
            !this.opts.persistent) {
            this.end();
        }
    }
    getText() {
        const { text } = this;
        if (text === undefined || text === '') {
            return undefined;
        }
        else {
            return this.reporter.stripMarkup(text);
        }
    }
    setText(text) {
        this.text = text;
        this.queueRender();
    }
    setApproximateETA(duration) {
        this.approximateETA = duration;
    }
    setTotal(total, approximate = false) {
        this.total = total;
        this.approximateTotal = approximate;
        this.queueRender();
    }
    pushText(text) {
        this.setText(text);
        this.textStack.push(text);
    }
    popText(text) {
        // Find
        const { textStack } = this;
        const index = textStack.indexOf(text);
        if (index === -1) {
            throw new Error(`No pushed text: ${text}`);
        }
        // Remove
        textStack.splice(index, 1);
        // Set last
        const last = textStack[textStack.length - 1];
        this.setText(last === undefined ? '' : last);
    }
    tick() {
        this.setCurrent(this.current + 1);
    }
    resume() {
        if (!this.paused || this.pausedStart === undefined) {
            return;
        }
        this.pausedElapsed += Date.now() - this.pausedStart;
        this.pausedStart = undefined;
        this.paused = false;
        this.render();
    }
    pause() {
        if (this.paused) {
            return;
        }
        this.pausedStart = Date.now();
        this.paused = true;
        this.render();
    }
    queueRender() {
        this.render();
    }
    end() { }
    render() { }
}
exports.default = ProgressBase;
