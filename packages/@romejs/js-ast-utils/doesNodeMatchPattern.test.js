"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const doesNodeMatchPattern_1 = require("./doesNodeMatchPattern");
const template_1 = require("./template");
rome_1.test('doesNodeMatchPattern', (t) => {
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `foo`, 'foo'), true);
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `this.foo`, 'this.foo'), true);
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `exports.foo`, 'exports.**'), true);
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `this.foo.bar`, 'this.foo.*'), true);
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `this.foo.bar.yes`, 'this.foo.*'), false);
    t.inlineSnapshot(doesNodeMatchPattern_1.default(template_1.default.expression `this.foo.bar.yes`, 'this.foo.**'), true);
});
