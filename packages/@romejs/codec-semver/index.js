"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const satisfies_1 = require("./satisfies");
const compare_1 = require("./compare");
const parse_1 = require("./parse");
exports.parseSemverRange = parse_1.parseSemverRange;
exports.parseSemverVersion = parse_1.parseSemverVersion;
const utils_1 = require("./utils");
const diagnostics_1 = require("@romejs/diagnostics");
var stringify_1 = require("./stringify");
exports.stringifySemver = stringify_1.default;
function sortSemverVersions(rawVersions, opts) {
    const versions = rawVersions.map((ver) => utils_1.normalizeUserVersion(ver, opts));
    return versions.sort((a, b) => compare_1.compareFromAst(a, b));
}
exports.sortSemverVersions = sortSemverVersions;
function maxSatisfyingSemver(rawVersions, rawRange, opts) {
    const versions = sortSemverVersions(rawVersions, opts).reverse();
    const range = utils_1.normalizeUserRange(rawRange, opts);
    for (const version of versions) {
        if (satisfies_1.satisfiesFromAst(version, range)) {
            return version;
        }
    }
    return undefined;
}
exports.maxSatisfyingSemver = maxSatisfyingSemver;
function minSatisfyingSemver(rawVersions, rawRange, opts) {
    const versions = sortSemverVersions(rawVersions, opts);
    const range = utils_1.normalizeUserRange(rawRange, opts);
    for (const version of versions) {
        if (satisfies_1.satisfiesFromAst(version, range)) {
            return version;
        }
    }
    return undefined;
}
exports.minSatisfyingSemver = minSatisfyingSemver;
function satisfiesSemver(rawVersion, rawRange, opts) {
    try {
        const version = utils_1.normalizeUserVersion(rawVersion, opts);
        const range = utils_1.normalizeUserRange(rawRange, opts);
        return satisfies_1.satisfiesFromAst(version, range);
    }
    catch (err) {
        if (err instanceof diagnostics_1.DiagnosticsError) {
            return false;
        }
        else {
            throw err;
        }
    }
}
exports.satisfiesSemver = satisfiesSemver;
