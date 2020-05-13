"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("@romejs/events");
class WebBridge extends events_1.Bridge {
    constructor() {
        super(...arguments);
        this.requests = this.createEvent({
            name: 'WebBridge.requests',
            direction: 'server->client',
        });
    }
}
exports.default = WebBridge;
