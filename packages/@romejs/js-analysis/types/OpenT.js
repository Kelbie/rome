"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const UnknownT_1 = require("./UnknownT");
const T_1 = require("./T");
class OpenT extends T_1.default {
    humanize(builder) {
        const type = this.utils.reduce(this);
        if (type === this) {
            return 'open';
        }
        else {
            return builder.humanize(type);
        }
    }
    reduce() {
        const node = this.graph.find(this);
        if (node === undefined) {
            return new UnknownT_1.default(this.scope, this.originNode);
        }
        const values = node.lines.map((line) => this.utils.reduce(line.value));
        return this.scope.createUnion(values, this.originNode);
    }
}
exports.default = OpenT;
OpenT.type = 'OpenT';
