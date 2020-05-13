"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const dedent_1 = require("./dedent");
const rome_1 = require("rome");
rome_1.test('dedent', (t) => {
    t.is(dedent_1.dedent('\tx\n\ty'), 'x\ny');
    t.is(dedent_1.dedent('\tx\n\t\ty\n\tz'), 'x\n\ty\nz');
    t.is(dedent_1.dedent `
        if (x) {
          y = ${'1'};
        }
      `, 'if (x) {\n  y = 1;\n}');
});
