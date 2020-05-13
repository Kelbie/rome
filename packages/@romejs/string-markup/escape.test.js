"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const escape_1 = require("./escape");
rome_1.test('should properly escape and then unescape backslashes', (t) => {
    t.is(escape_1.unescapeTextValue(escape_1.escapeMarkup('\\')), '\\');
    t.is(escape_1.escapeMarkup('C:\\Users\\sebmck\\'), 'C:\\\\Users\\\\sebmck\\\\');
});
