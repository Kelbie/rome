"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const testHelpers_1 = require("../testHelpers");
rome_1.test('no empty character class in regular expression', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // VALID
        'let foo = /^abc[a-zA-Z]/;foo;',
        'let regExp = new RegExp("^abc[]");regExp;',
        'let foo = /^abc/;foo;',
        'let foo = /[\\[]/;foo;',
        'let foo = /[\\]]/;foo;',
        'let foo = /[a-zA-Z\\[]/;foo;',
        'let foo = /[[]/;foo;',
        'let foo = /[\\[a-z[]]/;foo;',
        'let foo = /[\\-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\^\\$\\|]/g;foo;',
        'let foo = /[\\]]/uy;foo;',
        'let foo = /[\\]]/s;foo;',
        'let foo = /\\[]/;foo;',
        // INVALID
        'let foo = /^abc[]/;foo;',
        'let foo = /foo[]bar/;foo;',
        'let foo = "";if (foo.match(/^abc[]/)) { foo; }',
        'let foo = /[]]/;foo;',
        'let foo = /\\[[]/;foo;',
        'let foo = /\\[\\[\\]a-z[]/;foo;',
    ], { category: 'lint/noEmptyCharacterClass' });
});
