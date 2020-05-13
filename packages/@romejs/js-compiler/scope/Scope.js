"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const constants_1 = require("../constants");
const index_1 = require("./evaluators/index");
const GLOBALS = require("./globals");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
let scopeCounter = 0;
Error.stackTraceLimit = Infinity;
class Scope {
    constructor({ kind, node, parentScope, rootScope, }) {
        this.parentScope = parentScope;
        this.rootScope = rootScope;
        this.node = node;
        this.kind = kind;
        this.bindings = new Map();
        this.id = scopeCounter++;
        this.hasHoistedVars = false;
        this.globals = new Set();
        this.childScopeCache = new WeakMap();
    }
    setHoistedVars() {
        this.hasHoistedVars = true;
    }
    hasBindings() {
        return this.bindings.size > 0;
    }
    getOwnBindings() {
        return this.bindings;
    }
    getOwnBindingNames() {
        return Array.from(this.bindings.keys());
    }
    findScope(kind) {
        let scope = this;
        while (scope !== undefined) {
            if (scope.kind === kind) {
                return scope;
            }
            else {
                scope = scope.parentScope;
            }
        }
        return undefined;
    }
    getRootScope() {
        const { rootScope } = this;
        if (rootScope === undefined) {
            throw new Error(`Expected rootScope`);
        }
        return rootScope;
    }
    evaluate(node, parent = js_ast_1.MOCK_PARENT, creatorOnly = false, force = false) {
        if (node === undefined) {
            return this;
        }
        if (!force && node === this.node) {
            return this;
        }
        const cached = this.childScopeCache.get(node);
        if (cached !== undefined) {
            return cached;
        }
        let evaluator = index_1.default.get(node.type);
        if (!creatorOnly && evaluator !== undefined && evaluator.creator) {
            evaluator = undefined;
        }
        if (evaluator === undefined) {
            return this;
        }
        let scope = evaluator.build(node, parent, this);
        if (scope === undefined) {
            scope = this;
        }
        this.childScopeCache.set(node, scope);
        return scope;
    }
    fork(kind, node) {
        const rootScope = this.getRootScope();
        return new Scope({
            kind,
            node,
            parentScope: this,
            rootScope,
        });
    }
    dump(root = true) {
        if (root) {
            console.log('START');
        }
        console.log('------', this.id, this.kind);
        for (const [name, binding] of this.bindings) {
            console.log(' ', binding.id, '-', binding.constructor.name, name);
        }
        if (this.parentScope !== undefined) {
            this.parentScope.dump(false);
        }
        if (root) {
            console.log('END');
        }
    }
    getOwnBinding(name) {
        return this.bindings.get(name);
    }
    getBindingFromPath(path) {
        const { node } = path;
        if (js_ast_utils_1.isVariableIdentifier(node)) {
            // TODO we can do some isInTypeAnnotation magic to get the proper "type" binding
            return this.getBinding(node.name);
        }
        else {
            return undefined;
        }
    }
    getBinding(name) {
        const binding = this.bindings.get(name);
        if (binding !== undefined) {
            return binding;
        }
        const { parentScope } = this;
        if (parentScope !== undefined) {
            return parentScope.getBinding(name);
        }
        return undefined;
    }
    getBindingAssert(name) {
        const binding = this.getBinding(name);
        if (binding === undefined) {
            this.dump();
            throw new Error(`Expected ${name} binding`);
        }
        return binding;
    }
    addBinding(binding) {
        this.bindings.set(binding.name, binding);
        return binding;
    }
    hasBinding(name) {
        return this.getBinding(name) !== undefined;
    }
    generateUid(name) {
        return this.getRootScope().generateUid(name);
    }
    addGlobal(name) {
        this.globals.add(name);
    }
    isGlobal(name) {
        if (this.globals.has(name)) {
            return true;
        }
        if (this.parentScope !== undefined) {
            return this.parentScope.isGlobal(name);
        }
        return false;
    }
}
exports.default = Scope;
const GLOBAL_COMMENT_START = /^([\s+]|)global /;
const GLOBAL_COMMENT_COLON = /:(.*?)$/;
class RootScope extends Scope {
    constructor(context, ast) {
        super({
            kind: 'root',
            parentScope: undefined,
            rootScope: undefined,
            node: undefined,
        });
        this.uids = new Set();
        this.context = context;
        this.globals = new Set([
            ...GLOBALS.builtin,
            ...GLOBALS.es5,
            ...GLOBALS.es2015,
            ...GLOBALS.es2017,
            ...GLOBALS.browser,
            ...GLOBALS.worker,
            ...GLOBALS.node,
            ...GLOBALS.commonjs,
            ...GLOBALS.serviceworker,
            ...context.project.config.lint.globals,
            ...this.parseGlobalComments(ast),
        ]);
    }
    parseGlobalComments(ast) {
        const globals = [];
        for (const { value } of ast.comments) {
            // Check if comment starts with "global ", ignoring any leading whitespace
            if (!GLOBAL_COMMENT_START.test(value)) {
                continue;
            }
            // Remove prefix
            const clean = value.replace(GLOBAL_COMMENT_START, '');
            // Split by commas, supports comments like "foo, bar"
            const parts = clean.split(',');
            for (const part of parts) {
                let name = part.trim();
                // Support comments like "foo: true" amd "bar: false"
                if (GLOBAL_COMMENT_COLON.test(name)) {
                    const match = part.match(GLOBAL_COMMENT_COLON);
                    if (match == null) {
                        throw new Error('Used RegExp.test already so know this will always match');
                    }
                    // Remove everything after the colon
                    name = name.replace(GLOBAL_COMMENT_COLON, '');
                    const value = match[1].trim();
                    // Other tools would flag these as unavailable and remove them from the master set
                    // We don't do that, we might want to later though?
                    // Also, we should maybe validate the value to only true/false
                    if (value === 'false') {
                        break;
                    }
                }
                globals.push(name);
            }
        }
        return globals;
    }
    getRootScope() {
        return this;
    }
    generateUid(name) {
        const prefixed = `${constants_1.SCOPE_PRIVATE_PREFIX}${name === undefined ? '' : name}`;
        // Check for invalid names
        if (name !== undefined && !js_ast_utils_1.isValidIdentifierName(name)) {
            throw new Error(`${name} is not a valid identifier name`);
        }
        // TODO find some way to remove the possibility of user bindings colliding with our private prefix
        let counter = 0;
        while (true) {
            const suffix = counter === 0 ? '' : String(counter);
            const name = prefixed + suffix;
            if (this.uids.has(name)) {
                counter++;
            }
            else {
                this.uids.add(name);
                return name;
            }
        }
        throw new Error('Unreachable');
    }
}
exports.RootScope = RootScope;
