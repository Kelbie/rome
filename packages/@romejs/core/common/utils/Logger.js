"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cli_reporter_1 = require("@romejs/cli-reporter");
class Logger extends cli_reporter_1.Reporter {
    constructor(name, isEnabled, opts) {
        super({
            verbose: true,
            ...opts,
        });
        this._loggerName = name;
        this.isEnabled = isEnabled;
    }
    getMessagePrefix() {
        return `<dim>[${this._loggerName} ${process.pid}]</dim> `;
    }
}
exports.default = Logger;
