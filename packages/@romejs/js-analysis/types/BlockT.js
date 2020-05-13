"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class BlockT extends T_1.default {
    constructor(scope, originNode, body) {
        super(scope, originNode);
        this.body = body;
    }
    reduce() {
        const body = [];
        let changed = false;
        for (const type of this.body) {
            const reduced = this.utils.reduce(type);
            body.push(reduced);
            if (reduced !== type) {
                changed = true;
            }
        }
        if (changed) {
            return new BlockT(this.scope, this.originNode, body);
        }
        else {
            return this;
        }
    }
    humanize() {
        return '{}';
    }
}
exports.default = BlockT;
BlockT.type = 'BlockT';
