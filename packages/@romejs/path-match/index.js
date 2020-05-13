"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
exports.parsePathPattern = parse_1.parsePattern;
exports.parsePathPatternsFile = parse_1.parsePatternsFile;
const match_1 = require("./match");
var stringify_1 = require("./stringify");
exports.stringifyPathPattern = stringify_1.stringifyPathPattern;
function flipPathPatterns(patterns) {
    return patterns.map((pattern) => {
        return {
            ...pattern,
            negate: !pattern.negate,
        };
    });
}
exports.flipPathPatterns = flipPathPatterns;
function matchPath(path, patternNode, cwdSegs) {
    const matches = match_1.default(path.getSegments(), patternNode, cwdSegs);
    if (patternNode.negate) {
        return !matches;
    }
    else {
        return matches;
    }
}
exports.matchPath = matchPath;
function getGreater(pattern, num) {
    if (pattern.segments.length > num) {
        return pattern.segments.length;
    }
    else {
        return num;
    }
}
function matchPathPatterns(path, patterns, cwd) {
    // Bail out if there are no patterns
    if (patterns.length === 0) {
        return 'NO_MATCH';
    }
    let matches = 0;
    let notMatches = 0;
    let hasNegate = false;
    const pathSegments = path.getSegments();
    const cwdSegs = cwd === undefined ? undefined : cwd.getSegments();
    for (const pattern of patterns) {
        // No point in matching an empty pattern, could just contain a comment
        if (pattern.segments.length === 0) {
            continue;
        }
        if (pattern.negate) {
            hasNegate = true;
            if (match_1.default(pathSegments, { ...pattern, negate: false }, cwdSegs)) {
                notMatches = getGreater(pattern, notMatches);
            }
        }
        else {
            if (match_1.default(pathSegments, pattern, cwdSegs)) {
                matches = getGreater(pattern, matches);
            }
        }
    }
    // If we have a negate pattern, then we need to match more segments than it in order to qualify as a match
    if (hasNegate) {
        if (notMatches > matches) {
            return 'NO_MATCH';
        }
        else if (matches > notMatches) {
            return 'EXPLICIT_MATCH';
        }
        else {
            return 'IMPLICIT_MATCH';
        }
    }
    if (matches > 0) {
        return 'EXPLICIT_MATCH';
    }
    return 'NO_MATCH';
}
exports.matchPathPatterns = matchPathPatterns;
