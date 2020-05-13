"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const testHelpers_1 = require("./rules/testHelpers");
rome_1.test('format disabled in project config should not regenerate the file', async (t) => {
    // Intentionally weird formatting
    await testHelpers_1.testLint(t, 'foobar ( "yes" );', { category: undefined });
});
rome_1.test('format enabled in project config should result in regenerated file', async (t) => {
    await testHelpers_1.testLint(t, 'foobar ( "yes" );', {
        category: undefined,
    });
});
