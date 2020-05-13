"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class IntersectionT extends T_1.default {
    constructor(scope, originNode, types) {
        super(scope, originNode);
        this.types = types;
    }
    serialize(addType) {
        return {
            types: this.types.map((type) => addType(type)),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new IntersectionT(scope, originNode, Array(data.types).map((id) => getType(id)));
    }
    compatibleWith(otherType) {
        for (const type of this.types) {
            const compatibility = this.utils.checkCompability(type, otherType);
            if (compatibility.type === 'incompatible') {
                return compatibility;
            }
        }
        return true;
    }
    humanize(builder) {
        return this.types.map((type) => builder.humanize(type)).join(' & ');
    }
}
exports.default = IntersectionT;
IntersectionT.type = 'IntersectionT';
