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
const path_1 = require("@romejs/path");
const DOCUMENTS = '/Users/sebmck/Documents';
function _parsePathPattern(input) {
    return path_match_1.parsePathPattern({ input });
}
rome_1.test('match', (t) => {
    // Basic
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('sebmck')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('sebmck/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('Users')));
    t.false(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('')));
    t.false(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('# comment')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('sebmck')));
    // Single stars
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('/Users/*/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('/Users/*mck/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('/Users/se*ck/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('/Users/seb*/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath('/Projects/rome/index.js'), _parsePathPattern('*.js')));
    // Double stars
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath(DOCUMENTS), _parsePathPattern('**/Documents')));
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath('/Users/sebmck/Documents/Projects'), _parsePathPattern('/Users/**/Projects')));
    // Negate
    t.true(path_match_1.matchPath(path_1.createAbsoluteFilePath('/website/styles/site.css'), _parsePathPattern('*.css')));
    t.false(path_match_1.matchPath(path_1.createAbsoluteFilePath('/website/styles/site.css'), _parsePathPattern('!*.css')));
});
rome_1.test('matchPathPatterns', (t) => {
    t.true(path_match_1.matchPathPatterns(path_1.createAbsoluteFilePath('/scripts/foo.js'), [_parsePathPattern('scripts'), _parsePathPattern('styles')]) === 'EXPLICIT_MATCH');
    t.false(path_match_1.matchPathPatterns(path_1.createAbsoluteFilePath('/scripts/foo.js'), [_parsePathPattern('scripts'), _parsePathPattern('!scripts/*.js')]) === 'EXPLICIT_MATCH');
    t.true(path_match_1.matchPathPatterns(path_1.createAbsoluteFilePath('/scripts/foo.js'), [_parsePathPattern('scripts')]) === 'EXPLICIT_MATCH');
});
