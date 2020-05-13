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
rome_1.test('prefer function declarations', async (t) => {
    // Should complain on these
    await testHelpers_1.testLint(t, 'const foo = function () {};', {
        category: 'lint/preferFunctionDeclarations',
    });
    await testHelpers_1.testLint(t, 'const foo = () => {};', {
        category: 'lint/preferFunctionDeclarations',
    });
    // Should allow arrow functions when they have this
    await testHelpers_1.testLint(t, 'const foo = () => {this;};', {
        category: 'lint/preferFunctionDeclarations',
    });
    // But only if it refers to the actual arrow function
    await testHelpers_1.testLint(t, 'const foo = () => {function bar() {this;}};', {
        category: 'lint/preferFunctionDeclarations',
    });
    // Should ignore functions with return types since you can't express that with a declaration
    await testHelpers_1.testLint(t, 'const foo: string = function () {};', {
        category: 'lint/preferFunctionDeclarations',
        syntax: ['ts'],
    });
});
