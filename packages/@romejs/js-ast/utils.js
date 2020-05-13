"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.bindingKeys = new Map();
exports.visitorKeys = new Map();
exports.nodeNames = new Set();
function declareBuilder(type, opts) {
    exports.nodeNames.add(type);
    if (opts.visitorKeys !== undefined) {
        exports.visitorKeys.set(type, Object.keys(opts.visitorKeys));
    }
    if (opts.bindingKeys !== undefined) {
        exports.bindingKeys.set(type, Object.keys(opts.bindingKeys));
    }
}
// TODO only allow this method to be called on a node with only one required property
function createQuickBuilder(type, quickKey, opts) {
    declareBuilder(type, opts);
    return new QuickBuilder(type, opts.visitorKeys, quickKey);
}
exports.createQuickBuilder = createQuickBuilder;
function createBuilder(type, opts) {
    declareBuilder(type, opts);
    return new Builder(type, opts.visitorKeys);
}
exports.createBuilder = createBuilder;
class Builder {
    constructor(type, visitorKeys) {
        this.type = type;
        this.visitorKeys = visitorKeys;
    }
    create(opts, inheritNode) {
        // @ts-ignore
        return {
            loc: inheritNode === undefined ? undefined : js_ast_utils_1.inheritLoc(inheritNode),
            ...opts,
            type: this.type,
        };
    }
    is(node) {
        return node !== undefined && node.type === this.type;
    }
    normalize(node) {
        if (this.is(node)) {
            return node;
        }
        else {
            return undefined;
        }
    }
    assert(res) {
        if (res === undefined) {
            throw new Error(`Expected ${this.type} Node but got undefined`);
        }
        const node = js_ast_utils_1.assertSingleNode(res);
        if (node.type !== this.type) {
            throw new Error(`Expected ${this.type} Node but got ${node.type}`);
        }
        // @ts-ignore
        return node;
    }
}
class QuickBuilder extends Builder {
    constructor(type, visitorKeys, quickKey) {
        super(type, visitorKeys);
        this.quickKey = quickKey;
    }
    quick(arg, opts, inheritNode) {
        const node = {
            ...opts,
            [this.quickKey]: arg,
        };
        return this.create(node, inheritNode);
    }
}
