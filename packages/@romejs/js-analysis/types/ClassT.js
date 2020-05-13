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
const ObjPropT_1 = require("./ObjPropT");
const OpenT_1 = require("./OpenT");
const ObjT_1 = require("./ObjT");
class ClassT extends ObjT_1.default {
    constructor(scope, originNode, opts) {
        // point `class.prototype.__proto__` to `superClass.prototype`
        let protoProp = undefined;
        if (opts.extends) {
            const originNode = opts.extends.originNode;
            protoProp = new GetPropT_1.default(scope, originNode, opts.extends, new StringLiteralT_1.default(scope, originNode, 'prototype'));
        }
        // create `class.prototype.constructor`
        const constructorOpen = new OpenT_1.default(scope, undefined);
        const constructorProp = new ObjPropT_1.default(scope, undefined, 'constructor', constructorOpen);
        const instances = [...opts.instances, constructorProp];
        // create `class.prototype`
        const protoObj = new ObjT_1.default(scope, originNode, {
            props: instances,
            proto: protoProp,
            calls: [],
        });
        super(scope, originNode, {
            props: [
                ...opts.statics,
                new ObjPropT_1.default(scope, originNode, 'prototype', protoObj),
            ],
            proto: opts.extends,
            calls: opts.calls === undefined ? [] : opts.calls,
        });
        constructorOpen.shouldMatch(this);
        this._constructor = opts._constructor;
        this._statics = opts.statics;
        this._instances = opts.instances;
        this._extends = opts.extends;
    }
    serialize(addType) {
        return {
            constructor: this._constructor === undefined
                ? undefined
                : addType(this._constructor),
            statics: this._statics.map((type) => addType(type)),
            instances: this._instances.map((type) => addType(type)),
            extends: this._extends === undefined ? undefined : addType(this._extends),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new ClassT(scope, originNode, {
            _constructor: data.constructor === undefined
                ? undefined
                : getType(data.constructor),
            statics: Array(data.statics).map((id) => getType(id)),
            instances: Array(data.instances).map((id) => getType(id)),
            extends: data.extends === undefined ? undefined : getType(data.extends),
        });
    }
}
exports.default = ClassT;
ClassT.type = 'ClassT';
