"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const StringLiteralT_1 = require("./types/StringLiteralT");
const UnknownT_1 = require("./types/UnknownT");
const GetPropT_1 = require("./types/GetPropT");
const UnionT_1 = require("./types/UnionT");
const OpenT_1 = require("./types/OpenT");
class Scope {
    constructor(opts) {
        let { evaluator, parentScope } = opts;
        if (evaluator === undefined && parentScope !== undefined) {
            evaluator = parentScope.evaluator;
        }
        if (evaluator === undefined) {
            throw new Error('No evaluator was passed or inferred');
        }
        this.intrinsics = evaluator.intrinsics;
        this.evaluator = evaluator;
        this.hub = evaluator.hub;
        this.parentScope = parentScope;
        this.bindings = new Map();
    }
    getBinding(name) {
        let scope = this;
        while (scope) {
            const binding = scope.bindings.get(name);
            if (binding) {
                return binding.type;
            }
            scope = scope.parentScope;
        }
        return undefined;
    }
    getBindingAssert(name) {
        const binding = this.getBinding(name);
        if (binding === undefined) {
            throw new Error(`Expected binding ${name}`);
        }
        return binding;
    }
    query(paths) {
        let initial = this.getBinding(paths[0]);
        if (initial === undefined) {
            throw new Error(`Expected "${paths[0]}" binding, found ${JSON.stringify(this.getBindingNames())} ${this.evaluator.filename}`);
        }
        //invariant(initial !== undefined, `Expected "${paths[0]}" binding`);
        for (let i = 1; i < paths.length; i++) {
            initial = new GetPropT_1.default(this, undefined, initial, new StringLiteralT_1.default(this, undefined, paths[i]));
        }
        return initial;
    }
    declareBinding(name, originNode) {
        if (name === undefined) {
            throw new Error('Expected name');
        }
        this.bindings.set(name, {
            type: new OpenT_1.default(this, originNode),
            status: 'declared',
        });
    }
    addBinding(name, type) {
        if (name === undefined) {
            throw new Error('Expected name');
        }
        const existingBinding = this.bindings.get(name);
        if (existingBinding !== undefined && existingBinding.status === 'declared') {
            if (!(existingBinding.type instanceof OpenT_1.default)) {
                throw new Error('expected OpenT');
            }
            existingBinding.type.shouldMatch(type);
        }
        this.bindings.set(name, {
            type,
            status: 'initialized',
        });
    }
    getBindingNames() {
        const names = new Set(this.parentScope ? this.parentScope.getBindingNames() : []);
        for (const [name] of this.bindings) {
            names.add(name);
        }
        return Array.from(names);
    }
    getOwnBindingNames() {
        return Array.from(this.bindings.keys());
    }
    createUnion(types, originNode) {
        if (types.length === 0) {
            return new UnknownT_1.default(this, originNode);
        }
        else if (types.length === 1) {
            return types[0];
        }
        else {
            return new UnionT_1.default(this, originNode, types);
        }
    }
    fork() {
        return new Scope({ evaluator: this.evaluator, parentScope: this });
    }
    find(klass) {
        const scope = this.findOptional(klass);
        if (scope === undefined) {
            throw new Error('Failed to find class');
        }
        else {
            return scope;
        }
    }
    findOptional(klass) {
        let scope = this;
        do {
            if (scope instanceof klass) {
                return scope;
            }
            scope = scope.parentScope;
        } while (scope !== undefined);
        return undefined;
    }
    refine() {
        return new RefineScope({ evaluator: this.evaluator, parentScope: this });
    }
    evaluate(node) {
        return this.evaluator.evaluate(node, this);
    }
}
exports.Scope = Scope;
//#
class RefineScope extends Scope {
}
exports.RefineScope = RefineScope;
class ClassScope extends Scope {
    constructor(opts, meta) {
        super(opts);
        this.meta = meta;
    }
}
exports.ClassScope = ClassScope;
//#
class ThisScope extends Scope {
    constructor(opts, context) {
        super(opts);
        this.context = context;
    }
}
exports.ThisScope = ThisScope;
class FunctionScope extends ThisScope {
    constructor(opts, meta) {
        super(opts, meta.thisContext);
        this.meta = meta;
    }
}
exports.FunctionScope = FunctionScope;
