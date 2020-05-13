"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ObjT_1 = require("./ObjT");
class FunctionT extends ObjT_1.default {
    constructor(scope, originNode, opts) {
        super(scope, originNode, {
            props: opts.props,
            proto: opts.proto,
            calls: [],
        });
        this.params = opts.params;
        this.rest = opts.rest;
        this.returns = opts.returns;
        this.body = opts.body;
    }
    serialize(addType) {
        return {
            params: this.params.map((type) => addType(type)),
            rest: this.rest ? addType(this.rest) : undefined,
            returns: addType(this.returns),
            proto: this.proto === undefined ? undefined : addType(this.proto),
            body: this.body === undefined ? undefined : addType(this.body),
            props: this.props.map((type) => addType(type)),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new FunctionT(scope, originNode, {
            params: Array(data.params).map((id) => getType(id)),
            rest: data.rest === undefined ? undefined : getType(data.rest),
            returns: getType(data.returns),
            props: Array(data.props).map((id) => getType(id)),
            proto: data.proto === undefined ? undefined : getType(data.proto),
            body: data.body === undefined ? undefined : getType(data.body),
        });
    }
    humanize(builder) {
        return `(${this.params.map((param) => builder.humanize(param)).join(', ')}) => ${builder.humanize(this.returns)}`;
    }
    reduce() {
        // No body, just a type signature
        const { body } = this;
        if (body === undefined) {
            return this;
        }
        // Reduce the body and create a new function
        const reducedBody = this.utils.reduce(body);
        if (reducedBody !== body) {
            return new FunctionT(this.scope, this.originNode, {
                params: this.params,
                rest: this.rest,
                returns: this.returns,
                props: this.props,
                proto: this.proto,
                body: reducedBody,
            });
        }
        // Already been reduced
        return this;
    }
}
exports.default = FunctionT;
FunctionT.type = 'FunctionT';
