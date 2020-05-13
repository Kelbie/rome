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
rome_1.test('restricted globals', async (t) => {
    await testHelpers_1.testLint(t, 'console.log(event);', {
        category: 'lint/restrictedGlobals',
    });
    await testHelpers_1.testLint(t, `
    // valid use of event into the function scope.
    function foo(event) {
      console.info(event);
    }

    // invalid, event is used as a global.
    foo(event)
    `, { category: 'lint/restrictedGlobals' });
});
