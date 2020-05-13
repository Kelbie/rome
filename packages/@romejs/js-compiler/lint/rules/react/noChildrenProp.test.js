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
rome_1.test('no children props', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // INVALID
        `<MyComponent children={'foo'}></MyComponent>`,
        `React.createElement('div', {children: 'foo'})`,
        // VALID
        `<MyComponent><AnotherComponent /></MyComponent  >`,
        `React.createElement('div', {}, 'children')`,
        `React.createElement('div', child1, 'child2')`,
    ], { category: 'lint/noChildrenProp' });
});
