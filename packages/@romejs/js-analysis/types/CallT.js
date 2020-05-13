"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const NotCallableE_1 = require("./errors/NotCallableE");
const FunctionT_1 = require("./FunctionT");
const ObjT_1 = require("./ObjT");
const AnyT_1 = require("./AnyT");
const E_1 = require("./errors/E");
const T_1 = require("./T");
class CallT extends T_1.default {
    constructor(scope, originNode, callee, args) {
        super(scope, originNode);
        this.callee = callee;
        this.args = args;
    }
    reduce() {
        let callee = this.utils.reduce(this.callee);
        if (callee instanceof ObjT_1.default && callee.calls.length) {
            callee = this.utils.reduce(callee.calls[0]);
        }
        if (callee instanceof AnyT_1.default || callee instanceof E_1.default) {
            return new AnyT_1.default(this.scope, this.originNode);
        }
        else if (callee instanceof FunctionT_1.default) {
            return this.utils.reduce(callee.returns);
        }
        else {
            return new NotCallableE_1.default(this.scope, this.originNode, this.callee);
        }
    }
}
exports.default = CallT;
CallT.type = 'CallT';
