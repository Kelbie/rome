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
rome_1.test('no import assign', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        'import x from "y";\nx=1;',
        'import x from "y";\n[x]=1;',
        'import x from "y";\n({x}=1);',
        'import x from "y";\nx++',
        'import x from "y";\n[...x]=1;',
        'import x from "y";\n({...x}=1);',
        'import x from "y";\nfor (x in y);',
        'import x from "y";\nx+=1',
        'import * as x from "y";\nx=1;',
        'import {x} from "y";\nx=1;',
    ], { category: 'lint/noImportAssign' });
});
