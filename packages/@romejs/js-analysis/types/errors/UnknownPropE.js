"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const string_utils_1 = require("@romejs/string-utils");
const E_1 = require("./E");
class UnknownPropE extends E_1.default {
    constructor(scope, originNode, opts) {
        super(scope, originNode);
        this.thisKeys = opts.thisKeys;
        this.protoKeys = opts.protoKeys;
        this.allProps = [...this.thisKeys, ...this.protoKeys];
        this.key = opts.key;
        this.object = opts.object;
        this.property = opts.property;
    }
    sortProps(props) {
        if (props.length === 0) {
            return props;
        }
        const ratings = string_utils_1.orderBySimilarity(this.key, props);
        const sortedProps = ratings.map((prop) => prop.target);
        return sortedProps;
    }
    getError() {
        return {
            description: diagnostics_1.descriptions.TYPE_CHECK.UNKNOWN_PROP(this.key, this.allProps),
            lowerTarget: this.property,
            upperTarget: this.object,
        };
    }
}
exports.default = UnknownPropE;
UnknownPropE.type = 'UnknownPropE';
