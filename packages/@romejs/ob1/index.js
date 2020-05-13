"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function ob1Add(a, b) {
    // @ts-ignore
    return a + b;
}
exports.ob1Add = ob1Add;
function ob1Sub(a, b) {
    // @ts-ignore
    return a - b;
}
exports.ob1Sub = ob1Sub;
function ob1Get0(x) {
    // @ts-ignore
    return x;
}
exports.ob1Get0 = ob1Get0;
function ob1Get1(x) {
    // @ts-ignore
    return x;
}
exports.ob1Get1 = ob1Get1;
function ob1Get(x) {
    // @ts-ignore
    return x;
}
exports.ob1Get = ob1Get;
function ob1Coerce0(x) {
    return x;
}
exports.ob1Coerce0 = ob1Coerce0;
exports.ob1Number0 = ob1Coerce0(0);
exports.ob1Number0Neg1 = ob1Coerce0(-1);
function ob1Coerce1(x) {
    return x;
}
exports.ob1Coerce1 = ob1Coerce1;
exports.ob1Number1 = ob1Coerce1(1);
exports.ob1Number1Neg1 = ob1Coerce1(-1);
// Add 1 to a 0-based offset, thus converting it to 1-based.
function ob1Coerce0To1(x) {
    // @ts-ignore
    return x + 1;
}
exports.ob1Coerce0To1 = ob1Coerce0To1;
function ob1Coerce1To0(x) {
    // @ts-ignore
    return x - 1;
}
exports.ob1Coerce1To0 = ob1Coerce1To0;
function ob1Inc(x) {
    // @ts-ignore
    return x + 1;
}
exports.ob1Inc = ob1Inc;
function ob1Dec(x) {
    // @ts-ignore
    return x - 1;
}
exports.ob1Dec = ob1Dec;
