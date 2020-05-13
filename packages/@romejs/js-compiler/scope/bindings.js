"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
let id = 0;
class Binding {
    constructor(opts, defaultKind = 'variable') {
        this.isExported = false;
        this.scope = opts.scope;
        this.name = opts.name;
        this.node = opts.node;
        this.kind = opts.kind === undefined ? defaultKind : opts.kind;
        this.id = id++;
    }
    setExported(isExported) {
        this.isExported = isExported;
    }
}
exports.Binding = Binding;
class ConstBinding extends Binding {
    constructor(opts, value, kind = 'constant') {
        super(opts, kind);
        this.value = value;
    }
}
exports.ConstBinding = ConstBinding;
class LetBinding extends Binding {
}
exports.LetBinding = LetBinding;
class VarBinding extends Binding {
}
exports.VarBinding = VarBinding;
class ImportBinding extends Binding {
    constructor(opts, meta) {
        super(opts, 'import');
        this.meta = meta;
    }
}
exports.ImportBinding = ImportBinding;
class ArgumentsBinding extends Binding {
    constructor(opts) {
        super(opts, 'arguments');
    }
}
exports.ArgumentsBinding = ArgumentsBinding;
class FunctionBinding extends Binding {
    constructor(opts) {
        super(opts, 'function');
    }
}
exports.FunctionBinding = FunctionBinding;
class TypeBinding extends ConstBinding {
    constructor(opts, valueNode, kind) {
        super(opts, valueNode, 'type');
        this.typeKind = kind;
    }
}
exports.TypeBinding = TypeBinding;
class ClassBinding extends Binding {
    constructor(opts) {
        super(opts, 'class');
    }
}
exports.ClassBinding = ClassBinding;
