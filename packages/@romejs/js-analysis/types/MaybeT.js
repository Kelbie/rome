"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const VoidT_1 = require("./VoidT");
const NullT_1 = require("./NullT");
class MaybeT extends T_1.default {
    constructor(scope, originNode, parent) {
        super(scope, originNode);
        this.parent = parent;
    }
    serialize(addType) {
        return {
            parent: addType(this.parent),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new MaybeT(scope, originNode, getType(data.parent));
    }
    humanize(builder) {
        return `?${builder.humanize(this.parent)}`;
    }
    explodeUnion() {
        return [
            new VoidT_1.default(this.scope, this.originNode),
            new NullT_1.default(this.scope, this.originNode),
            ...this.utils.explodeUnion(this.parent),
        ];
    }
    compatibleWith(otherType) {
        if (otherType instanceof MaybeT) {
            return this.utils.checkCompability(this.parent, otherType.parent);
        }
        else {
            return (otherType instanceof VoidT_1.default ||
                otherType instanceof NullT_1.default ||
                this.utils.checkCompability(this.parent, otherType));
        }
    }
}
exports.default = MaybeT;
MaybeT.type = 'MaybeT';
