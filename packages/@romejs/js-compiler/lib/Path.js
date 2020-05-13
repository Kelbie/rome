"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const reduce_1 = require("../methods/reduce");
class Path {
    constructor(node, context, opts) {
        const ancestryPaths = opts.ancestryPaths || [];
        this.ancestryPaths = ancestryPaths;
        if (node === js_ast_1.MOCK_PARENT) {
            this.parentPath = this;
        }
        else if (ancestryPaths.length === 0) {
            this.parentPath = new Path(js_ast_1.MOCK_PARENT, context, {
                isMock: true,
            });
        }
        else {
            this.parentPath = ancestryPaths[0];
        }
        this.node = node;
        this.parent = this.parentPath.node;
        this.context = context;
        const parentScope = opts.parentScope === undefined ? context.getRootScope() : opts.parentScope;
        let scope = opts.scope;
        if (scope === undefined) {
            if (opts.noScopeCreation === true) {
                scope = parentScope;
            }
            else {
                scope = parentScope.evaluate(node, this.parent, true);
            }
        }
        this.scope = scope;
        this.nodeKey = opts.nodeKey;
        this.listKey = opts.listKey;
        this.isMock = opts.isMock === true;
        this.opts = opts;
        this.hooks = opts.hooks === undefined ? [] : opts.hooks;
    }
    callHook(
    // rome-ignore lint/noExplicitAny
    descriptor, arg, optionalRet, requiredDepth) {
        const hook = this.findHook(descriptor, requiredDepth);
        if (hook === undefined) {
            if (optionalRet === undefined) {
                throw new Error(`No ${descriptor.name} hook found`);
            }
            else {
                return optionalRet;
            }
        }
        if (descriptor.call === undefined) {
            throw new Error("Hook doesn't have a call method");
        }
        const { depth, ref } = hook;
        const { state, value, bubble } = descriptor.call(this, ref.state, arg);
        ref.state = state;
        if (bubble === true) {
            return this.callHook(descriptor, arg, value, depth + 1);
        }
        else {
            return value;
        }
    }
    provideHook(
    // rome-ignore lint/noExplicitAny
    descriptor, state) {
        this.hooks.push({
            state: {
                ...descriptor.initialState,
                ...state,
            },
            descriptor,
        });
        return this.node;
    }
    findHook(descriptor, requiredDepth = 0) {
        let depth = 0;
        for (const { hooks } of this.ancestryPaths) {
            for (const hook of hooks) {
                if (hook.descriptor === descriptor) {
                    if (depth === requiredDepth) {
                        return { ref: hook, depth };
                    }
                    else {
                        depth++;
                    }
                }
            }
        }
        return undefined;
    }
    findAncestry(callback) {
        for (const path of this.ancestryPaths) {
            if (callback(path)) {
                return path;
            }
        }
        return undefined;
    }
    getChildPath(key) {
        // rome-ignore lint/noExplicitAny
        const node = this.node[key];
        if (node === undefined) {
            throw new Error(`Attempted to get child path for ${key} but no such node existed`);
        }
        return new Path(node, this.context, {
            parentScope: this.scope,
            ancestryPaths: this.ancestryPaths.concat([this]),
            nodeKey: key,
        });
    }
    getChildPaths(key) {
        // rome-ignore lint/noExplicitAny
        const nodes = this.node[key];
        if (nodes === undefined) {
            throw new Error(`Attempted to get child paths for ${key} but no such node existed`);
        }
        if (!Array.isArray(nodes)) {
            throw new Error(`Expected child nodes for ${key} to be an array`);
        }
        const ancestryPaths = this.ancestryPaths.concat([this]);
        return nodes.map((node, i) => {
            return new Path(node, this.context, {
                parentScope: this.scope,
                ancestryPaths,
                listKey: i,
                nodeKey: key,
            });
        });
    }
    getPathKeys() {
        const parts = [];
        let path = this;
        while (path !== undefined && !path.isMock) {
            if (path.listKey !== undefined) {
                parts.push(String(path.listKey));
            }
            if (path.nodeKey !== undefined) {
                parts.push(path.nodeKey);
            }
            path = path.parentPath;
        }
        return parts.reverse();
    }
    fork(newNode) {
        return new Path(newNode, this.context, this.getPathOptions());
    }
    getPathOptions() {
        return {
            ...this.opts,
            hooks: this.hooks,
            parentScope: this.scope === undefined ? undefined : this.scope.parentScope,
        };
    }
    traverse(name, callback) {
        this.reduce({
            name,
            enter(path) {
                callback(path);
                return path.node;
            },
        });
    }
    reduce(visitors, opts) {
        return reduce_1.default(this.node, Array.isArray(visitors) ? visitors : [visitors], this.context, { ...this.getPathOptions(), ...opts });
    }
}
exports.default = Path;
