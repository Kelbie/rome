"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@romejs/string-markup");
const path_match_1 = require("@romejs/path-match");
const rome_1 = require("rome");
function _parsePathPattern(input) {
    return path_match_1.parsePathPattern({ input });
}
rome_1.test('pattern', async (t) => {
    // Negate and wildcard
    t.snapshot(_parsePathPattern('!foo'));
    t.snapshot(_parsePathPattern(''));
    // Trailing slash and wildcards
    t.snapshot(_parsePathPattern('/foo/bar'));
    t.snapshot(_parsePathPattern('*/foo/bar'));
    t.snapshot(_parsePathPattern('**/foo/bar'));
    t.snapshot(_parsePathPattern('**/*foo/bar'));
    // Random
    t.snapshot(_parsePathPattern('foo'));
    t.snapshot(_parsePathPattern('foo/'));
    t.snapshot(_parsePathPattern('foo/bar'));
    t.snapshot(_parsePathPattern('foo//bar'));
    t.snapshot(_parsePathPattern('foo/*/bar'));
    t.snapshot(_parsePathPattern('foo/**/bar'));
    t.snapshot(_parsePathPattern('foo/*bar'));
    t.snapshot(_parsePathPattern('foo/bar*'));
    t.snapshot(_parsePathPattern('foo/*bar*'));
    t.snapshot(_parsePathPattern('foo/*bar*foob'));
    // Comments
    t.snapshot(_parsePathPattern('# foobar'));
    t.snapshot(_parsePathPattern('foo/bar # foobar'));
    t.snapshot(_parsePathPattern('foo/bar\\#foobar'));
    t.snapshot(_parsePathPattern('foo/\\#foobar'));
    // Windows separators
    t.snapshot(_parsePathPattern('\\\\foo\\\\bar'));
    t.snapshot(_parsePathPattern('*\\\\foo\\\\bar'));
    t.snapshot(_parsePathPattern('**\\\\foo\\\\bar'));
    t.snapshot(_parsePathPattern('**\\\\*foo\\\\bar'));
    t.snapshot(_parsePathPattern('hello\\\\world'));
});
