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
rome_1.test('disallow duplicate group names in regular expression', async (t) => {
    await testHelpers_1.testLint(t, `/(?<month>[0-9])-(?<year>[0-9])-(?<month>[0-9])-(?<year>[0-9])-(?<day>[0-9])-([0-9])-(?<month>[0-9])/`, { category: 'lint/noDuplicateGroupNamesInRegularExpressions' });
});
