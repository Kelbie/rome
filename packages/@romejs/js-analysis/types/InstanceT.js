"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const StringLiteralT_1 = require("./StringLiteralT");
const GetPropT_1 = require("./GetPropT");
const ObjT_1 = require("./ObjT");
class InstanceT extends ObjT_1.default {
    constructor(scope, originNode, target, typeParameters) {
        const prototype = new GetPropT_1.default(scope, originNode, target, new StringLiteralT_1.default(scope, originNode, 'prototype'));
        super(scope, originNode, {
            props: [],
            proto: prototype,
            calls: [],
        });
        this.typeParameters = typeParameters;
        this.target = target;
    }
    serialize(addType) {
        return {
            target: addType(this.target),
            params: this.typeParameters.map((type) => addType(type)),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new InstanceT(scope, originNode, getType(data.target), Array(data.params).map((id) => getType(id)));
    }
    humanize(builder) {
        const name = builder.humanize(this.target);
        const typeParams = this.typeParameters;
        if (typeParams.length === 0) {
            return name;
        }
        else {
            return `${name}<${typeParams.map((param) => builder.humanize(param)).join(', ')}>`;
        }
    }
    compatibleWith(otherType) {
        return (otherType instanceof InstanceT &&
            this.utils.checkCompability(this.target, otherType.target));
    }
}
exports.default = InstanceT;
InstanceT.type = 'InstanceT';
