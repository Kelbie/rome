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
rome_1.test('no async promise executor', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // VALID
        'new Promise(() => {})',
        'new Promise(() => {}, async function unrelated() {})',
        'class Foo {} new Foo(async () => {})',
        // INVALID
        'new Promise(async function foo() {})',
        'new Promise(async () => {})',
        'new Promise(((((async () => {})))))',
    ], { category: 'lint/noAsyncPromiseExecutor' });
});
