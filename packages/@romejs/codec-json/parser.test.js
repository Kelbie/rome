"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@romejs/core");
const diagnostics_1 = require("@romejs/diagnostics");
const codec_json_1 = require("@romejs/codec-json");
const rome_1 = require("rome");
const path_1 = require("@romejs/path");
// These are just some very basic tests, most of it is already covered by test262-parse so most are redundant
function parseExtJSON(opts) {
    return codec_json_1.parseJSON({ ...opts, path: path_1.createUnknownFilePath('input.rjson') });
}
rome_1.test('comments', (t) => {
    // comment at beginning
    t.true(parseExtJSON({ input: '// comment\ntrue' }));
    t.true(parseExtJSON({ input: '/* comment */\ntrue' }));
    t.true(parseExtJSON({ input: '/* comment */ true' }));
    // comment at end
    t.true(parseExtJSON({ input: 'true\n// comment' }));
    t.true(parseExtJSON({ input: 'true\n/* comment */' }));
    t.true(parseExtJSON({ input: 'true/* comment */' }));
    // comment before object property
    t.looksLike(parseExtJSON({ input: '{/* comment */ "foo": "bar"}' }), {
        foo: 'bar',
    });
    t.looksLike(parseExtJSON({ input: '{// comment\n"foo": "bar"}' }), {
        foo: 'bar',
    });
    // comment before object property value
    t.looksLike(parseExtJSON({ input: '{"foo": /* comment */ "bar"}' }), {
        foo: 'bar',
    });
    t.looksLike(parseExtJSON({ input: '{"foo": // comment\n"bar"}' }), {
        foo: 'bar',
    });
    // comment after object property value
    t.looksLike(parseExtJSON({ input: '{"foo": "bar" /* comment */,}' }), {
        foo: 'bar',
    });
    t.looksLike(parseExtJSON({ input: '{"foo": "bar" // comment\n,}' }), {
        foo: 'bar',
    });
    // comment after object property
    t.looksLike(parseExtJSON({ input: '{"foo": "bar", /* comment */}' }), {
        foo: 'bar',
    });
    t.looksLike(parseExtJSON({ input: '{"foo": "bar", // comment\n}' }), {
        foo: 'bar',
    });
    // comment before array element
    t.looksLike(parseExtJSON({ input: '[/* comment */ "foo"]' }), ['foo']);
    t.looksLike(parseExtJSON({ input: '[//comment\n"foo"]' }), ['foo']);
    // comment after array element
    t.looksLike(parseExtJSON({ input: '["foo" /* comment */]' }), ['foo']);
    t.looksLike(parseExtJSON({ input: '["foo" //comment\n]' }), ['foo']);
    // comment after array element value
    t.looksLike(parseExtJSON({ input: '["foo" /* comment */, "bar"]' }), ['foo', 'bar']);
    t.looksLike(parseExtJSON({ input: '["foo" //comment\n, "bar"]' }), ['foo', 'bar']);
    // comment only in array
    t.looksLike(parseExtJSON({ input: '[/* comment */]' }), []);
    t.looksLike(parseExtJSON({ input: '[// comment\n]' }), []);
    // comment only in object
    t.looksLike(parseExtJSON({ input: '{/* comment */}' }), {});
    t.looksLike(parseExtJSON({ input: '{// comment\n}' }), {});
    // ensure closed block comment
    t.throws(() => {
        parseExtJSON({ input: 'true /* unclosed comment' });
    }, diagnostics_1.descriptions.JSON.UNCLOSED_BLOCK_COMMENT.message.value);
});
rome_1.test('numbers', (t) => {
    t.is(parseExtJSON({ input: '1' }), 1);
    t.is(parseExtJSON({ input: '12' }), 12);
    t.is(parseExtJSON({ input: '123' }), 123);
    t.is(parseExtJSON({ input: '1.2' }), 1.2);
    t.is(parseExtJSON({ input: '1234.21234' }), 1234.21234);
    t.is(parseExtJSON({ input: '0.5e+5' }), 50000);
    t.is(parseExtJSON({ input: '0.5e-5' }), 0.000005);
    t.is(parseExtJSON({ input: '0.5E+5' }), 50000);
    t.is(parseExtJSON({ input: '0.5E-5' }), 0.000005);
});
rome_1.test('strings', (t) => {
    t.is(parseExtJSON({ input: '"foo"' }), 'foo');
    t.is(parseExtJSON({ input: '"foo\u1234"' }), 'foo\u1234');
    t.is(parseExtJSON({ input: '"foo\\n"' }), 'foo\n');
    t.is(parseExtJSON({ input: '"foo\\t"' }), 'foo\t');
    t.throws(() => {
        parseExtJSON({ input: '"foo' });
    }, diagnostics_1.descriptions.JSON.UNCLOSED_STRING.message.value);
    t.throws(() => {
        parseExtJSON({ input: '"foo\n"' });
    }, diagnostics_1.descriptions.JSON.UNCLOSED_STRING.message.value);
    t.throws(() => {
        parseExtJSON({ input: "'foo'" });
    }, diagnostics_1.descriptions.JSON.SINGLE_QUOTE_USAGE.message.value);
    t.throws(() => {
        parseExtJSON({ input: '"\\u000Z"' });
    }, diagnostics_1.descriptions.STRING_ESCAPE.INVALID_HEX_DIGIT_FOR_ESCAPE.message.value);
    t.throws(() => {
        parseExtJSON({ input: '"\t"' });
    }, diagnostics_1.descriptions.STRING_ESCAPE.INVALID_STRING_CHARACTER.message.value);
    t.throws(() => {
        parseExtJSON({ input: '"\\u123"' });
    }, diagnostics_1.descriptions.STRING_ESCAPE.NOT_ENOUGH_CODE_POINTS.message.value);
});
rome_1.test('booleans', (t) => {
    t.is(parseExtJSON({ input: 'true' }), true);
    t.is(parseExtJSON({ input: 'false' }), false);
});
rome_1.test('null', (t) => {
    t.is(parseExtJSON({ input: 'null' }), null);
});
rome_1.test('undefined', (t) => {
    t.throws(() => {
        t.is(parseExtJSON({ input: 'undefined' }), undefined);
    }, diagnostics_1.descriptions.JSON.UNDEFINED_IN_JSON.message.value);
});
rome_1.test('arrays', (t) => {
    t.looksLike(parseExtJSON({ input: '[]' }), []);
    t.looksLike(parseExtJSON({ input: '[1, 2, 3]' }), [1, 2, 3]);
    t.looksLike(parseExtJSON({ input: '[[1, 2, 3]]' }), [[1, 2, 3]]);
    t.throws(() => {
        parseExtJSON({ input: '[,]' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
    t.throws(() => {
        parseExtJSON({ input: '[1,,]' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
    t.throws(() => {
        parseExtJSON({ input: '[1, /*comment*/,]' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
    t.throws(() => {
        parseExtJSON({ input: '["foo": "bar"]' });
    }, diagnostics_1.descriptions.JSON.MISTAKEN_ARRAY_IDENTITY.message.value);
});
rome_1.test('objects', (t) => {
    t.looksLike(parseExtJSON({ input: '{}' }), {});
    t.looksLike(parseExtJSON({ input: '{"foo": "bar"}' }), { foo: 'bar' });
    t.looksLike(parseExtJSON({ input: '{"foo": "bar", "bar": "foo"}' }), {
        foo: 'bar',
        bar: 'foo',
    });
    t.throws(() => {
        parseExtJSON({ input: '{,}' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
    t.throws(() => {
        parseExtJSON({ input: '{"foo": "bar",,}' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
    t.throws(() => {
        parseExtJSON({ input: '{"foo": "bar", /*comment*/,}' });
    }, diagnostics_1.descriptions.JSON.REDUNDANT_COMMA.message.value);
});
rome_1.test('regular JSON', (t) => {
    t.throws(() => {
        codec_json_1.parseJSON({ input: '{foo: "bar"}' });
    }, diagnostics_1.descriptions.JSON.PROPERTY_KEY_UNQUOTED_IN_JSON.message.value);
    t.throws(() => {
        codec_json_1.parseJSON({ input: '// foobar\ntrue' });
    }, diagnostics_1.descriptions.JSON.COMMENTS_IN_JSON.message.value);
    t.throws(() => {
        codec_json_1.parseJSON({ input: '/* foobar */\ntrue' });
    }, diagnostics_1.descriptions.JSON.COMMENTS_IN_JSON.message.value);
    t.throws(() => {
        codec_json_1.parseJSON({ input: '{"foo": "bar",}' });
    }, diagnostics_1.descriptions.JSON.TRAILING_COMMA_IN_JSON.message.value);
    t.throws(() => {
        codec_json_1.parseJSON({ input: '["foo",]' });
    }, diagnostics_1.descriptions.JSON.TRAILING_COMMA_IN_JSON.message.value);
});
