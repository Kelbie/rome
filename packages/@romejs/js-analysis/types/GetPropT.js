"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
const ObjPropT_1 = require("./ObjPropT");
const UnknownPropE_1 = require("./errors/UnknownPropE");
const ObjIndexPropT_1 = require("./ObjIndexPropT");
const StringLiteralT_1 = require("./StringLiteralT");
const UnknownT_1 = require("./UnknownT");
const AnyT_1 = require("./AnyT");
const ObjT_1 = require("./ObjT");
const E_1 = require("./errors/E");
class GetPropT extends T_1.default {
    constructor(scope, originNode, object, property) {
        super(scope, originNode);
        this.object = object;
        this.property = property;
    }
    serialize(addType) {
        return {
            object: addType(this.object),
            property: addType(this.property),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new GetPropT(scope, originNode, getType(data.object), getType(data.property));
    }
    lookup(object, property, opts = {}) {
        object = this.utils.reduce(object);
        property = this.utils.reduce(property);
        const thisKeys = new Set();
        //
        const protoKeys = opts.protoKeys === undefined ? [] : opts.protoKeys;
        const topObject = opts.topObject === undefined ? object : opts.topObject;
        // turn property into string key
        let key;
        if (property instanceof StringLiteralT_1.default) {
            key = property.value;
        }
        // look up on object
        if (key !== undefined && object instanceof ObjT_1.default) {
            //
            const indexers = [];
            for (const maybePropRaw of object.props) {
                const maybeProp = this.utils.reduce(maybePropRaw);
                if (maybeProp instanceof ObjPropT_1.default) {
                    if (maybeProp.key === key) {
                        // TODO collate these in case there's multiple properties of this name
                        return this.utils.reduce(maybeProp.value);
                    }
                    else {
                        thisKeys.add(maybeProp.key);
                    }
                }
                else if (maybeProp instanceof ObjIndexPropT_1.default) {
                    indexers.push(maybeProp);
                }
            }
            //
            for (const indexer of indexers) {
                if (this.utils.isCompatibleWith(indexer.key, property)) {
                    return this.utils.reduce(indexer.value);
                }
            }
            //
            if (object.proto) {
                return this.lookup(object.proto, property, {
                    topObject,
                    protoKeys: [...protoKeys, ...thisKeys],
                });
            }
        }
        // property lookups on an `any` return `any`!
        if (object instanceof AnyT_1.default || object instanceof E_1.default) {
            return new AnyT_1.default(this.scope, this.originNode);
        }
        //
        if (typeof key === 'string') {
            return new UnknownPropE_1.default(this.scope, this.originNode, {
                object: topObject,
                property,
                key,
                thisKeys: Array.from(thisKeys),
                protoKeys,
            });
        }
        else {
            return new UnknownT_1.default(this.scope, this.originNode);
        }
    }
    reduce() {
        return this.lookup(this.object, this.property);
    }
}
exports.default = GetPropT;
GetPropT.type = 'GetPropT';
