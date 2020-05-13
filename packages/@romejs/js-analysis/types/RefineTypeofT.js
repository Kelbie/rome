"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const StringLiteralT_1 = require("./StringLiteralT");
const BooleanT_1 = require("./BooleanT");
const NumericT_1 = require("./NumericT");
const StringT_1 = require("./StringT");
const VoidT_1 = require("./VoidT");
class RefineTypeofT extends T_1.default {
    constructor(scope, node, str, fallback) {
        super(scope, node);
        this.str = str;
        this.fallback = fallback;
    }
    reduce() {
        const { fallback, utils } = this;
        const str = utils.reduce(this.str);
        if (str instanceof StringLiteralT_1.default) {
            let val;
            switch (str.value) {
                case 'string': {
                    val = new StringT_1.default(this.scope, undefined);
                    break;
                }
                case 'number': {
                    val = new NumericT_1.default(this.scope, undefined);
                    break;
                }
                case 'undefined': {
                    val = new VoidT_1.default(this.scope, undefined);
                    break;
                }
                case 'boolean': {
                    val = new BooleanT_1.default(this.scope, undefined);
                    break;
                }
                case 'symbol':
                case 'function':
                case 'object':
                    // TODO
                    return utils.reduce(fallback);
                default:
                    // TODO complain about unknown value
                    return utils.reduce(fallback);
            }
            // make sure our refinement is actually possible and matches a value in `fallback`
            // then pluck the matching type
            const types = utils.explodeUnion(fallback);
            for (const type of types) {
                if (utils.isCompatibleWith(type, val)) {
                    return utils.reduce(type);
                }
            }
            // TODO complain of a missing condition
            return utils.reduce(fallback);
        }
        return utils.reduce(fallback);
    }
}
exports.default = RefineTypeofT;
RefineTypeofT.type = 'RefineTypeofT';
