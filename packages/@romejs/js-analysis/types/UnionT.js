"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class UnionT extends T_1.default {
    constructor(scope, originNode, types) {
        super(scope, originNode);
        this.types = [...new Set(types)];
    }
    serialize(addType) {
        return {
            types: this.types.map((type) => addType(type)),
        };
    }
    static hydrate(scope, originNode, data, getType) {
        return new UnionT(scope, originNode, Array(data.types).map((id) => getType(id)));
    }
    reduce() {
        const uniqTypes = [];
        const types = this.explodeUnion();
        for (const type of types) {
            let foundMatch = false;
            for (const compareType of uniqTypes) {
                const isCompatible = this.utils.isCompatibleWith(compareType, type);
                if (isCompatible) {
                    foundMatch = true;
                    break;
                }
            }
            if (foundMatch === false) {
                uniqTypes.push(type);
            }
        }
        if (uniqTypes.length === types.length) {
            return this;
        }
        else if (uniqTypes.length === 1) {
            return uniqTypes[0];
        }
        else {
            return new UnionT(this.scope, this.originNode, uniqTypes);
        }
    }
    explodeUnion() {
        let types = [];
        const visited = new Set([this]);
        for (const type of this.types) {
            const reduced = this.utils.reduce(type);
            if (visited.has(reduced)) {
                continue;
            }
            else {
                visited.add(reduced);
            }
            types = types.concat(this.utils.explodeUnion(type));
        }
        return types;
    }
    compatibleWith(otherType) {
        const ourTypes = this.utils.explodeUnion(this);
        // fast path to check if a union contains a type
        if (ourTypes.includes(otherType)) {
            return true;
        }
        const otherTypes = this.utils.explodeUnion(otherType);
        const missing = [];
        for (const type of ourTypes) {
            let compatible = false;
            for (const otherType of otherTypes) {
                if (this.utils.isCompatibleWith(type, otherType)) {
                    compatible = true;
                }
            }
            if (compatible === false) {
                missing.push(type);
            }
        }
        if (missing.length === 0) {
            return true;
        }
        else {
            // create custom error with the types that weren't in the opposing one
            //return new MissingUnionE(this.scope, otherType.originNode, otherType, this, missing);
            return false;
        }
    }
    humanize(builder) {
        return this.types.map((type) => builder.humanize(type)).join(' | ');
    }
}
exports.default = UnionT;
UnionT.type = 'UnionT';
