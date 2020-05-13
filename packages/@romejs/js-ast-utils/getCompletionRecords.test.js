"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const getCompletionRecords_1 = require("./getCompletionRecords");
const rome_1 = require("rome");
const js_parser_1 = require("@romejs/js-parser");
const js_ast_1 = require("@romejs/js-ast");
function helper(input) {
    return getCompletionRecords_1.default(js_ast_1.functionDeclaration.assert(js_parser_1.parseJS({
        path: 'unknown',
        input: `function foo(){${input}}`,
    }).body[0]).body);
}
rome_1.test('invalid', async (t) => {
    t.snapshot(helper(`{}`));
    t.snapshot(helper(`'foobar';`));
    t.snapshot(helper(`if (bar) {'foobar';}`));
    t.snapshot(helper(`if (bar) {'foobar';} else {}`));
    t.snapshot(helper(`switch (foo) {}`));
    t.snapshot(helper(`switch (foo) {case 'bar': {}}`));
    t.snapshot(helper(`switch (foo) {default: {}}`));
});
rome_1.test('completions', async (t) => {
    t.snapshot(helper(`return false;`));
    t.snapshot(helper(`return; invalid;`));
    t.snapshot(helper(`if (bar) {return false;}`));
    t.snapshot(helper(`if (bar) {return false;} else {return true;}`));
    t.snapshot(helper(`switch (foo) {default: {return false;}}`));
    t.snapshot(helper(`switch (foo) {default: {return false;}}`));
});
rome_1.test('mix', async (t) => {
    t.snapshot(helper(`switch (foo) {default: {if (true) {return false;}}}`));
});
