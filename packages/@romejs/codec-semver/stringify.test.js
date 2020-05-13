"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@romejs/string-markup");
const codec_semver_1 = require("@romejs/codec-semver");
const rome_1 = require("rome");
rome_1.test('stringify', (t) => {
    // basic version and whitespace
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3' })), '1.2.3');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '    1.2.3' })), '1.2.3');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3    ' })), '1.2.3');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '\t\t1.2.3\r\n' })), '1.2.3');
    // retains prerelease and build
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3-prerelease' })), '1.2.3-prerelease');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3+build' })), '1.2.3+build');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3-prerelease+build' })), '1.2.3-prerelease+build');
    // comparators
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '~1.2.3' })), '~1.2.3');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '~ 1.2.3' })), '~1.2.3');
    // wildcards
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2' })), '1.2');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.*.3' })), '1.*.3');
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.x' })), '1');
    // ranges
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3 - 1.3.4' })), '1.2.3 - 1.3.4');
    // logical and
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3 >= 1.3.4' })), '1.2.3 >=1.3.4');
    // logical or
    t.is(codec_semver_1.stringifySemver(codec_semver_1.parseSemverRange({ input: '1.2.3 || 1.3.4' })), '1.2.3 || 1.3.4');
});
