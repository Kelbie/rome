"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const OpenT_1 = require("./OpenT");
class OpenIntrinsicT extends OpenT_1.default {
    constructor(scope, originNode, name) {
        super(scope, originNode);
        this.name = name;
    }
    serialize() {
        return {
            name: this.name,
        };
    }
    static hydrate(scope, originNode, data) {
        return scope.intrinsics.get(String(data.name));
    }
    humanize() {
        return 'open intrinsic';
    }
}
exports.default = OpenIntrinsicT;
OpenIntrinsicT.type = 'OpenIntrinsicT';
