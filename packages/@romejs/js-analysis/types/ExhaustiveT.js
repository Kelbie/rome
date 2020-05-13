"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const E_1 = require("./errors/E");
const AnyT_1 = require("./AnyT");
const diagnostics_1 = require("@romejs/diagnostics");
class ENotExhaustive extends E_1.default {
    constructor(scope, originNode, target, only, extraenous) {
        super(scope, originNode);
        this.target = target;
        this.only = only;
        this.extraenous = extraenous;
    }
    getError() {
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.NOT_EXHAUSTIVE(this.utils.humanize(this.only), this.utils.humanize(this.target)),
            lowerTarget: this.target,
        };
    }
}
ENotExhaustive.type = 'ENotExhaustive';
class ExhaustiveT extends T_1.default {
    constructor(scope, originNode, target, only) {
        super(scope, originNode);
        this.target = target;
        this.only = only;
    }
    serialize(addType) {
        return {
            target: addType(this.target),
            only: addType(this.only),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new ExhaustiveT(scope, originNode, getType(data.target), getType(data.only));
    }
    reduce() {
        const target = this.utils.reduce(this.target);
        const only = this.utils.reduce(this.only);
        if (target instanceof AnyT_1.default || only instanceof AnyT_1.default) {
            return this.only;
        }
        const targetCandidates = this.utils.explodeUnion(target);
        const onlyCandidates = this.utils.explodeUnion(only);
        const extraneous = [];
        for (const possible of targetCandidates) {
            let compatible = false;
            for (const otherType of onlyCandidates) {
                if (this.utils.isCompatibleWith(possible, otherType)) {
                    compatible = true;
                }
            }
            if (compatible === false) {
                extraneous.push(possible);
            }
        }
        if (extraneous.length === 0) {
            return target;
        }
        else {
            return new ENotExhaustive(this.scope, this.originNode, this.target, this.only, extraneous);
        }
    }
    humanize(builder) {
        return `exhaustive ${builder.humanize(this.target)} should only match ${builder.humanize(this.target)}`;
    }
}
exports.default = ExhaustiveT;
ExhaustiveT.type = 'ExhaustiveT';
