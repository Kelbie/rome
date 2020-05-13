"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@romejs/string-markup");
const pretty_format_1 = require("@romejs/pretty-format");
const rome_1 = require("rome");
rome_1.test('strings', (t) => {
    t.is(pretty_format_1.default('yes'), "'yes'");
});
rome_1.test('numbers', (t) => {
    t.is(pretty_format_1.default(NaN), 'NaN');
    t.is(pretty_format_1.default(Infinity), 'Infinity');
    t.is(pretty_format_1.default(-Infinity), '-Infinity');
    t.is(pretty_format_1.default(-0), '-0');
    t.is(pretty_format_1.default(1), '1');
    t.is(pretty_format_1.default(10), '10');
    t.is(pretty_format_1.default(100), '100');
    t.is(pretty_format_1.default(1000), '1_000');
    t.is(pretty_format_1.default(10000), '10_000');
    t.is(pretty_format_1.default(100000), '100_000');
    t.is(pretty_format_1.default(1000000), '1_000_000');
    t.is(pretty_format_1.default(10000000), '10_000_000');
    t.is(pretty_format_1.default(100000000), '100_000_000');
    t.is(pretty_format_1.default(1000000000), '1_000_000_000');
});
rome_1.test('booleans', (t) => {
    t.is(pretty_format_1.default(true), 'true');
    t.is(pretty_format_1.default(false), 'false');
});
rome_1.test('null', (t) => {
    t.is(pretty_format_1.default(null), 'null');
});
rome_1.test('undefined', (t) => {
    t.is(pretty_format_1.default(undefined), 'undefined');
});
rome_1.test('arrays', (t) => {
    t.is(pretty_format_1.default([1, 2]), `Array [\n  1\n  2\n]`);
    t.is(pretty_format_1.default([1, [2, 3, [4, 5]]]), 'Array [\n  1\n  Array [\n    2\n    3\n    Array [\n      4\n      5\n    ]\n  ]\n]');
});
rome_1.test('regexps', (t) => {
    t.is(pretty_format_1.default(/foo/g), '/foo/g');
});
rome_1.test('symbols', (t) => {
    t.is(pretty_format_1.default(Symbol()), 'Symbol()');
    t.is(pretty_format_1.default(Symbol('test')), 'Symbol(test)');
});
rome_1.test('objects', (t) => {
    t.is(pretty_format_1.default({}), 'Object {}');
    t.is(pretty_format_1.default({ foo: 'bar' }), "Object {foo: 'bar'}");
    t.is(pretty_format_1.default({ 'foo||{}': 'bar' }), "Object {'foo||{}': 'bar'}");
    t.is(pretty_format_1.default({
        [Symbol('foo')]: 'bar',
        [Symbol.iterator]: 'foo',
    }), "Object {\n  Symbol(foo): 'bar'\n  Symbol(Symbol.iterator): 'foo'\n}");
});
rome_1.test('iterables', (t) => {
    t.is(pretty_format_1.default(new Set([1, 2, 3])), 'Set [\n  1\n  2\n  3\n]');
    t.is(pretty_format_1.default(new Map([['a', 1], ['b', 2], ['c', 3]])), 'Map [\n  a => 1\n  b => 2\n  c => 3\n]');
});
rome_1.test('functions', (t) => {
    t.is(pretty_format_1.default(function () { }), 'Function anonymous');
    t.is(pretty_format_1.default(function named() { }), 'Function named');
    function withProps() { }
    withProps.foo = function withPropsFoo() { };
    withProps.bar = 'yes';
    t.is(pretty_format_1.default(withProps), "Function withProps {\n  bar: 'yes'\n  foo: Function withPropsFoo\n}");
    t.is(pretty_format_1.default(String.prototype.indexOf), 'NativeFunction indexOf');
});
rome_1.test('circular detection', (t) => {
    // Parallel ref
    const parallel = {};
    t.is(pretty_format_1.default({ foo: parallel, bar: parallel }), `Object {\n  bar: Object {}\n  foo: Object {}\n}`);
    // Circular ref
    const circular = {};
    circular.obj = circular;
    t.is(pretty_format_1.default(circular), 'Object {obj: Circular Object 0}');
    // Circular deep top ref
    const circularDeepTop = {};
    circularDeepTop.foo = {
        bar: circularDeepTop,
    };
    t.is(pretty_format_1.default(circularDeepTop), 'Object {foo: Object {bar: Circular Object 0}}');
    // circular deep ref
    const circularDeep = { foo: {} };
    circularDeep.foo.bar = circularDeep.foo;
    t.is(pretty_format_1.default(circularDeep), 'Object {foo: Object {bar: Circular Object 1}}');
});
