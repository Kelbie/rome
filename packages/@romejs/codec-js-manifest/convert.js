"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_spdx_license_1 = require("@romejs/codec-spdx-license");
const dependencies_1 = require("./dependencies");
const codec_semver_1 = require("@romejs/codec-semver");
const path_match_1 = require("@romejs/path-match");
const name_1 = require("./name");
function convertManifestToJSON(manifest) {
    return {
        // Include unknown properties from the initial package.json
        ...manifest.raw,
        name: name_1.manifestNameToString(manifest.name),
        description: manifest.description,
        private: manifest.private,
        type: manifest.type,
        homepage: manifest.homepage,
        repository: manifest.repository,
        bugs: manifest.bugs,
        main: manifest.main,
        // TODO we now support fallbacks which means manifest.exports is lossy
        //exports: exportsToObject(manifest.exports),
        // rome-ignore lint/noExplicitAny
        exports: manifest.raw.exports,
        author: manifest.author,
        contributors: manifest.contributors,
        maintainers: manifest.maintainers,
        version: manifest.version === undefined
            ? undefined
            : codec_semver_1.stringifySemver(manifest.version),
        license: manifest.license === undefined
            ? undefined
            : codec_spdx_license_1.stringifySPDXLicense(manifest.license),
        files: maybeArray(manifest.files.map((pattern) => path_match_1.stringifyPathPattern(pattern))),
        keywords: maybeArray(manifest.keywords),
        cpu: maybeArray(manifest.cpu),
        os: maybeArray(manifest.os),
        bin: mapToObject(manifest.bin),
        scripts: mapToObject(manifest.scripts),
        engines: mapToObject(manifest.engines),
        dependencies: dependencyMapToObject(manifest.dependencies),
        devDependencies: dependencyMapToObject(manifest.devDependencies),
        optionalDependencies: dependencyMapToObject(manifest.optionalDependencies),
        peerDependencies: dependencyMapToObject(manifest.peerDependencies),
        // Common misspelling. If this existed then it was turned into bundledDependencies
        bundleDependencies: undefined,
        bundledDependencies: maybeArray(manifest.bundledDependencies),
    };
}
exports.convertManifestToJSON = convertManifestToJSON;
function exportsToObject(exports) {
    if (exports === false) {
        return false;
    }
    if (exports === true) {
        return;
    }
    if (exports.size === 0) {
        return {};
    }
    const obj = {};
    for (const [key, entries] of exports) {
        if (entries.size === 1) {
            const def = entries.get('default');
            if (def !== undefined) {
                obj[key.join()] = def.relative.join();
                continue;
            }
        }
        const entriesObj = {};
        for (const [type, alias] of entries) {
            entriesObj[type] = alias.relative.join();
        }
        obj[key.join()] = entriesObj;
    }
    return obj;
}
exportsToObject;
function maybeArray(items) {
    if (items.length === 0) {
        return undefined;
    }
    else {
        return items;
    }
}
function mapToObject(map) {
    if (map.size === 0) {
        return;
    }
    const obj = {};
    for (const [key, value] of map) {
        obj[key] = value;
    }
    return obj;
}
function dependencyMapToObject(map) {
    if (map.size === 0) {
        return;
    }
    const obj = {};
    for (const [name, pattern] of map) {
        const key = name_1.manifestNameToString(name);
        if (key !== undefined) {
            obj[key] = dependencies_1.stringifyDependencyPattern(pattern);
        }
    }
    return obj;
}
