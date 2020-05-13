"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_semver_1 = require("@romejs/codec-semver");
const parser_core_1 = require("@romejs/parser-core");
const path_1 = require("@romejs/path");
const name_1 = require("./name");
const ob1_1 = require("@romejs/ob1");
const diagnostics_1 = require("@romejs/diagnostics");
function stringifyDependencyPattern(pattern) {
    switch (pattern.type) {
        case 'hosted-git': {
            let str = `${pattern.host}:${pattern.user}/${pattern.repo}`;
            if (pattern.commitish !== undefined) {
                str += `#${pattern.commitish}`;
            }
            return str;
        }
        case 'file':
            return `file:${pattern.path}`;
        case 'semver':
            return codec_semver_1.stringifySemver(pattern.range);
        case 'tag':
            return pattern.tag;
        case 'git':
        case 'http-tarball':
            if (pattern.hash === undefined) {
                return pattern.url;
            }
            else {
                return `${pattern.url}#${pattern.hash}`;
            }
        case 'npm': {
            let str = `${NPM_PREFIX}${pattern.name}`;
            if (pattern.range !== undefined) {
                str += `@${codec_semver_1.stringifySemver(pattern.range)}`;
            }
            return str;
        }
        case 'link':
            return `${LINK_PREFIX}${pattern.path.join()}`;
    }
}
exports.stringifyDependencyPattern = stringifyDependencyPattern;
function explodeHashUrl(pattern, consumer) {
    const parts = pattern.split('#');
    if (parts.length > 2) {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.TOO_MANY_HASH_PARTS);
    }
    return {
        hash: parts[1],
        url: parts[0],
    };
}
function removePrefix(prefix, value) {
    if (value.startsWith(prefix)) {
        return value.slice(prefix.length);
    }
    else {
        return value;
    }
}
const GITHUB_SHORTHAND = /^[^:@%\/\s.\-][^:@%\/\s]*[\/][^:@\s\/%]+(?:#.*)?$/;
const HOSTED_GIT_PREFIXES = [
    'bitbucket',
    'github',
    'gist',
    'gitlab',
];
function parseHostedGit(host, pattern, consumer) {
    // Extract and trim hash
    let commitish;
    if (pattern.includes('#')) {
        const hashIndex = pattern.indexOf('#');
        commitish = pattern.slice(hashIndex + 1);
        pattern = pattern.slice(0, hashIndex - 1);
    }
    const parts = pattern.split('/');
    if (parts.length > 2) {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.TOO_MANY_HOSTED_GIT_PARTS);
    }
    let user = parts[0];
    if (user === undefined) {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.MISSING_HOSTED_GIT_USER);
        user = 'unknown';
    }
    let repo = parts[1];
    if (repo === undefined) {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.MISSING_HOSTED_GIT_REPO);
        repo = 'unknown';
    }
    const incomplete = {
        type: 'hosted-git',
        host,
        user,
        repo,
        commitish,
    };
    return {
        ...incomplete,
        url: getHostedGitURL(incomplete),
    };
}
function getHostedGitURL(pattern) {
    switch (pattern.host) {
        case 'bitbucket':
            return '';
        case 'gitlab':
        case 'gist':
            return '';
        case 'github':
            return '';
    }
}
exports.getHostedGitURL = getHostedGitURL;
const GIT_PATTERN_MATCHERS = [
    /^git:/,
    /^git\+.+:/,
    /^ssh:/,
    /^https?:.+\.git$/,
    /^https?:.+\.git#.+/,
];
function parseGit(pattern, consumer) {
    return {
        type: 'git',
        ...explodeHashUrl(pattern, consumer),
    };
}
function parseHttpTarball(pattern, consumer) {
    return {
        type: 'http-tarball',
        ...explodeHashUrl(pattern, consumer),
    };
}
function parseSemver(pattern, consumer, loose) {
    const ast = parser_core_1.tryParseWithOptionalOffsetPosition({
        loose,
        path: consumer.path,
        input: pattern,
    }, {
        getOffsetPosition: () => consumer.getLocation('inner-value').start,
        parse: (opts) => codec_semver_1.parseSemverRange(opts),
    });
    return {
        type: 'semver',
        range: ast,
    };
}
//# FILE
const FILE_PREFIX_REGEX = /^\.{1,2}\//;
function parseFile(pattern) {
    return {
        type: 'file',
        path: removePrefix('file:', pattern),
    };
}
//# TAG
// This regex will likely need to be refined, not sure what the allowable characters of a tag are
const TAG_REGEX = /^[a-z]+$/g;
function parseTag(pattern) {
    return {
        type: 'tag',
        tag: pattern,
    };
}
//# LINK
const LINK_PREFIX = 'link:';
function parseLink(pattern) {
    return {
        type: 'link',
        path: path_1.createUnknownFilePath(pattern.slice(LINK_PREFIX.length)),
    };
}
//# NPM
const NPM_PREFIX = 'npm:';
function parseNpm(pattern, consumer, loose) {
    // Prune prefix
    let offset = NPM_PREFIX.length;
    pattern = pattern.slice(NPM_PREFIX.length);
    if (pattern === '') {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.EMPTY_NPM_PATTERN);
        return {
            type: 'npm',
            name: {
                org: undefined,
                packageName: undefined,
            },
            range: undefined,
        };
    }
    // Split and verify count
    const parts = pattern.split('@');
    let nameRaw = '';
    let rangeRaw;
    // Org signifier
    if (parts[0] === '') {
        nameRaw += '@';
        parts.shift();
    }
    // Name - We know there'll be at least two due to the empty string conditional
    nameRaw = String(parts.shift());
    // Range
    rangeRaw = parts.shift();
    if (parts.length > 0) {
        consumer.unexpected(diagnostics_1.descriptions.MANIFEST.TOO_MANY_NPM_PARTS);
    }
    const name = name_1.normalizeName({
        name: nameRaw,
        loose,
        unexpected({ description, at, start, end }) {
            consumer.unexpected(description, {
                at,
                loc: start === undefined
                    ? undefined
                    : consumer.getLocationRange(ob1_1.ob1Add(start, offset), end === undefined ? undefined : ob1_1.ob1Add(end, offset), 'inner-value'),
            });
        },
    });
    // Increase offset passed name
    offset += nameRaw.length;
    offset++;
    let range;
    if (rangeRaw !== undefined) {
        range = parser_core_1.tryParseWithOptionalOffsetPosition({
            loose,
            path: consumer.path,
            input: rangeRaw,
        }, {
            getOffsetPosition: () => {
                const pos = consumer.getLocation('inner-value').start;
                return {
                    ...pos,
                    column: ob1_1.ob1Add(pos.column, offset),
                };
            },
            parse: (opts) => codec_semver_1.parseSemverRange(opts),
        });
    }
    return {
        type: 'npm',
        name,
        range,
    };
}
//#
function parseGitDependencyPattern(consumer) {
    const pattern = consumer.asString();
    for (const host of HOSTED_GIT_PREFIXES) {
        const prefix = `${host}:`;
        if (pattern.startsWith(prefix)) {
            return parseHostedGit(host, removePrefix(prefix, pattern), consumer);
        }
    }
    for (const matcher of GIT_PATTERN_MATCHERS) {
        if (matcher.test(pattern)) {
            return parseGit(pattern, consumer);
        }
    }
    if (GITHUB_SHORTHAND.test(pattern)) {
        return parseHostedGit('github', pattern, consumer);
    }
    return undefined;
}
exports.parseGitDependencyPattern = parseGitDependencyPattern;
function parseDependencyPattern(consumer, loose) {
    const pattern = consumer.asString();
    const gitPattern = parseGitDependencyPattern(consumer);
    if (gitPattern !== undefined) {
        return gitPattern;
    }
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
        return parseHttpTarball(pattern, consumer);
    }
    if (pattern.startsWith(NPM_PREFIX)) {
        return parseNpm(pattern, consumer, loose);
    }
    if (pattern.startsWith(LINK_PREFIX)) {
        return parseLink(pattern);
    }
    if (FILE_PREFIX_REGEX.test(pattern) ||
        path_1.createUnknownFilePath(pattern).isAbsolute() ||
        pattern.startsWith('file:')) {
        return parseFile(pattern);
    }
    if (pattern.match(TAG_REGEX)) {
        return parseTag(pattern);
    }
    return parseSemver(pattern, consumer, loose);
}
exports.parseDependencyPattern = parseDependencyPattern;
function normalizeDependencies(root, key, loose) {
    const map = new Map();
    if (!root.has(key)) {
        return map;
    }
    const consumer = root.get(key);
    // Some ridiculous code has the dependencies property as an empty array
    if (Array.isArray(consumer.asUnknown()) && loose) {
        return map;
    }
    for (const [rawName, value] of consumer.asMap()) {
        const name = name_1.normalizeName({
            name: rawName,
            loose,
            unexpected: ({ description, at }) => {
                value.unexpected(description, {
                    at,
                    target: 'key',
                });
            },
        });
        map.set(name, parseDependencyPattern(value, loose));
    }
    return map;
}
exports.normalizeDependencies = normalizeDependencies;
