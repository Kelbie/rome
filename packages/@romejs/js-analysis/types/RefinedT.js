"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const MissingUnionE_1 = require("./errors/MissingUnionE");
const T_1 = require("./T");
class RefinedT extends T_1.default {
    constructor(scope, originNode, root, remove) {
        super(scope, originNode);
        this.root = root;
        this.remove = remove;
    }
    reduce() {
        const { root } = this;
        const exploded = this.utils.explodeUnion(root);
        const removeTypes = this.utils.explodeUnion(this.remove);
        const clean = [];
        const removed = [];
        // remove any possible derived types from the root that are compatible with the removed type
        for (const type of exploded) {
            let compatible = false;
            // check if any of the removed types are compatible, if every removed type is incompatible then
            // we've refined away the type
            for (const remove of removeTypes) {
                if (this.utils.isCompatibleWith(type, remove)) {
                    compatible = true;
                }
            }
            if (compatible === false) {
                clean.push(type);
            }
            else {
                removed.push(type);
            }
        }
        if (removed.length === 0) {
            // return an error here because the removed type doesn't exist in the root
            return new MissingUnionE_1.default(root.scope, root.originNode, root, this.remove, removed);
        }
        else {
            return root.scope.createUnion(clean, root.originNode);
        }
    }
}
exports.default = RefinedT;
RefinedT.type = 'RefinedT';
