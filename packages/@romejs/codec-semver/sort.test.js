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
rome_1.test('sort', (t) => {
    const sorted = codec_semver_1.sortSemverVersions(['5.3.6', '1.2.3', '3.2.1', '1.2.4']);
    t.is(codec_semver_1.stringifySemver(sorted[0]), '1.2.3');
    t.is(codec_semver_1.stringifySemver(sorted[1]), '1.2.4');
    t.is(codec_semver_1.stringifySemver(sorted[2]), '3.2.1');
    t.is(codec_semver_1.stringifySemver(sorted[3]), '5.3.6');
});
