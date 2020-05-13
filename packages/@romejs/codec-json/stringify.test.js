"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@romejs/core");
const codec_json_1 = require("@romejs/codec-json");
const rome_1 = require("rome");
const path_1 = require("@romejs/path");
function consumeExtJSON(opts) {
    return codec_json_1.consumeJSONExtra({
        ...opts,
        path: path_1.createUnknownFilePath('input.rjson'),
    });
}
rome_1.test('arrays', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '[]' })), '[]');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '[1]' })), '[1]');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '[1,]' })), '[1]');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '[1, 2, 3]' })), '[\n  1\n  2\n  3\n]');
});
rome_1.test('booleans', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: 'true' })), 'true');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: 'false' })), 'false');
});
rome_1.test('numbers', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '1' })), '1');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '12' })), '12');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '123' })), '123');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '123.45' })), '123.45');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '1.2341234123412341e+27' })), '1.2341234123412341e+27');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '1.2341234123412341E+27' })), '1.2341234123412341e+27');
});
rome_1.test('null', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: 'null' })), 'null');
    const funcToNull = consumeExtJSON({ input: '1' });
    funcToNull.consumer.setValue(() => { });
    t.is(codec_json_1.stringifyJSON(funcToNull), 'null');
    const undefinedToNull = consumeExtJSON({ input: '1' });
    undefinedToNull.consumer.setValue(undefined);
    t.is(codec_json_1.stringifyJSON(undefinedToNull), 'null');
    const NaNToNull = consumeExtJSON({ input: '1' });
    NaNToNull.consumer.setValue(NaN);
    t.is(codec_json_1.stringifyJSON(NaNToNull), 'NaN');
});
rome_1.test('objects', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '{}' })), '{}');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '{"foo":"bar"}' })), 'foo: "bar"');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '{"foo":"bar",}' })), 'foo: "bar"');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '{"foo":"bar", "bar": "foo"}' })), 'bar: "foo"\nfoo: "bar"');
    // ignore functions and undefined
    const ret = consumeExtJSON({ input: '{}' });
    ret.consumer.get('foo').setValue('bar');
    ret.consumer.get('func').setValue(function () { });
    ret.consumer.get('undef').setValue(undefined);
    t.is(codec_json_1.stringifyJSON(ret), 'foo: "bar"');
});
const complexTest = `// root comment
/* and another!*/
foo: {
  // comment before property
  bar: {nested: true}
  great: 1.233e+58
  yes: null
}
// hello!
hello: [
  // comment before element
  "world"
  2
  3.53
]`;
rome_1.test('complex', (t) => {
    const consumer = consumeExtJSON({ input: complexTest });
    t.is(codec_json_1.stringifyJSON(consumer), complexTest);
});
rome_1.test('comments', (t) => {
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: '// foo\ntrue' })), '// foo\ntrue');
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({ input: 'true\n// foo' })), '// foo\ntrue');
    //# Comments - loose
    // comments at end of object
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `{
    "foo": "bar",
    // end comment
  }`,
    })), 'foo: "bar"\n// end comment');
    // comments at end of array
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `[
    "foobar",
    // end comment
  ]`,
    })), '[\n  "foobar"\n  // end comment\n]');
    // comments in empty array
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `[
    // inner comment
  ]`,
    })), '[\n  // inner comment\n]');
    // comments in empty object
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `{
    // inner comment
  }`,
    })), '{\n  // inner comment\n}');
    //# Comments - object property
    // before property
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `{
    /* bar */
    "foo": "bar",
  }`,
    })), '/* bar */\nfoo: "bar"');
    // before value
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `{
    "foo": /* bar */ "bar",
  }`,
    })), '/* bar */\nfoo: "bar"');
    // after value
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `{
    "foo": "bar" /* bar */,
  }`,
    })), '/* bar */\nfoo: "bar"');
    //# Comments - array element
    // before element
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `[
    /* bar */
    "foo",
  ]`,
    })), '[\n  /* bar */\n  "foo"\n]');
    // after value
    t.is(codec_json_1.stringifyJSON(consumeExtJSON({
        input: `[
    "foo" /* bar */,
  ]`,
    })), '[\n  /* bar */\n  "foo"\n]');
});
rome_1.test('recursion', (t) => {
    t.throws(() => {
        const ret = consumeExtJSON({ input: '{}' });
        const foo = {};
        foo.bar = foo;
        ret.consumer.get('foo').setValue(foo);
        codec_json_1.stringifyJSON(ret);
    });
});
