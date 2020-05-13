"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const OpenIntrinsicT_1 = require("./types/OpenIntrinsicT");
class Intrinsics {
    constructor(scope) {
        this.scope = scope;
        this.intrinsicByName = new Map();
        this.NumberPrototype = this.createOpenT('NumberPrototype');
        this.Number = this.createOpenT('Number');
        this.StringPrototype = this.createOpenT('StringPrototype');
        this.String = this.createOpenT('String');
        this.ObjectPrototype = this.createOpenT('ObjectPrototype');
        this.Object = this.createOpenT('Object');
        this.ArrayPrototype = this.createOpenT('ArrayPrototype');
        this.Array = this.createOpenT('Array');
        this.RegExpPrototype = this.createOpenT('RegExpPrototype');
        this.RegExp = this.createOpenT('RegExp');
    }
    get(name) {
        const t = this.intrinsicByName.get(name);
        if (t === undefined) {
            throw new Error(`No intrinsic found for ${name}`);
        }
        return t;
    }
    createOpenT(name) {
        const t = new OpenIntrinsicT_1.default(this.scope, undefined, name);
        this.intrinsicByName.set(name, t);
        return t;
    }
    link() {
        this.String.shouldMatch(this.scope.query(['String']));
        this.StringPrototype.shouldMatch(this.scope.query(['String', 'prototype']));
        this.Object.shouldMatch(this.scope.query(['Object']));
        this.ObjectPrototype.shouldMatch(this.scope.query(['Object', 'prototype']));
        this.Array.shouldMatch(this.scope.query(['Array']));
        this.ArrayPrototype.shouldMatch(this.scope.query(['Array', 'prototype']));
        this.RegExp.shouldMatch(this.scope.query(['RegExp']));
        this.RegExpPrototype.shouldMatch(this.scope.query(['RegExp', 'prototype']));
        this.Number.shouldMatch(this.scope.query(['Number']));
        this.NumberPrototype.shouldMatch(this.scope.query(['Number', 'prototype']));
    }
}
exports.default = Intrinsics;
