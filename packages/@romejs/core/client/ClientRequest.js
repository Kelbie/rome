"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("./commands");
const consume_1 = require("@romejs/consume");
const events_1 = require("@romejs/events");
const review_1 = require("./review");
class ClientRequest {
    constructor(client, type = 'local', query) {
        this.client = client;
        this.type = type;
        this.query = query;
    }
    fork(query) {
        return new ClientRequest(this.client, this.type, query);
    }
    async init() {
        try {
            const { requestFlags } = this.query;
            if (requestFlags !== undefined && requestFlags.review) {
                return await this.initReview();
            }
            else {
                return await this.initCommand();
            }
        }
        catch (err) {
            return {
                type: 'ERROR',
                fatal: false,
                handled: false,
                name: err.name,
                message: err.message,
                stack: err.stack,
            };
        }
    }
    async initReview() {
        return review_1.default(this);
    }
    async initCommand() {
        const localCommand = commands_1.localCommands.get(this.query.commandName);
        if (this.type === 'master' || localCommand === undefined) {
            return this.initFromMaster();
        }
        else {
            return this.initFromLocal(localCommand);
        }
    }
    async initFromLocal(
    // rome-ignore lint/noExplicitAny
    localCommand) {
        const { query } = this;
        let flags;
        if (localCommand.defineFlags !== undefined) {
            flags = localCommand.defineFlags(consume_1.consumeUnknown(query.commandFlags, 'flags/invalid'));
        }
        const res = await localCommand.callback(this, flags);
        if (res === true) {
            return {
                type: 'SUCCESS',
                data: undefined,
                hasData: false,
                markers: [],
            };
        }
        else if (res === false) {
            return {
                type: 'ERROR',
                fatal: false,
                // Local command would have printed something
                handled: true,
                name: 'Error',
                message: 'Command was not successful',
                stack: undefined,
            };
        }
        else {
            return res;
        }
    }
    async initFromMaster() {
        const { client } = this;
        try {
            const bridge = await client.findOrStartMaster();
            return await bridge.query.call(this.query);
        }
        catch (err) {
            if (err instanceof events_1.BridgeError) {
                return {
                    type: 'ERROR',
                    fatal: true,
                    handled: false,
                    name: 'Error',
                    message: 'Server died while processing command. Results may be incomplete.',
                    stack: undefined,
                };
            }
            else {
                throw err;
            }
        }
    }
}
exports.default = ClientRequest;
