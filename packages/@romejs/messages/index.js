"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function sprintf(msg, ...args) {
    return msg.replace(/\$(\d+)/g, (match, num) => {
        return String(args[num]);
    });
}
function createMessageFactory(messages) {
    // @ts-ignore: TS complains about {} not being full of the possible properties in message... which is true
    // but they will be filled it by the time we return
    const obj = {};
    for (const key in messages) {
        const msg = messages[key];
        obj[key] = (...args) => {
            return sprintf(msg, ...args);
        };
    }
    return obj;
}
exports.createMessageFactory = createMessageFactory;
