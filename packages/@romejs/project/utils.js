"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path_match_1 = require("@romejs/path-match");
const path_1 = require("@romejs/path");
const constants_1 = require("./constants");
function assertHardMeta(meta) {
    const { configPath, projectFolder: folder, consumer } = meta;
    if (configPath === undefined || folder === undefined || consumer === undefined) {
        throw new Error('This is not a disk project');
    }
    return {
        ...meta,
        configPath,
        consumer,
        projectFolder: folder,
    };
}
exports.assertHardMeta = assertHardMeta;
function arrayOfStrings(consumer) {
    if (consumer.exists()) {
        return consumer.asArray().map((item) => item.asString());
    }
    else {
        return [];
    }
}
exports.arrayOfStrings = arrayOfStrings;
function arrayOfPatterns(consumer) {
    // TODO consumer.handleThrownDiagnostics
    return consumer.asArray().map((item) => {
        return path_match_1.parsePathPattern({
            path: consumer.filename,
            input: item.asString(),
            offsetPosition: item.getLocation('inner-value').start,
        });
    });
}
exports.arrayOfPatterns = arrayOfPatterns;
function mergeArrays(a, b) {
    if (a === undefined) {
        return a;
    }
    if (b === undefined) {
        return a;
    }
    return [...a, ...b];
}
exports.mergeArrays = mergeArrays;
function mergeAbsoluteFilePathSets(a, b) {
    if (a === undefined) {
        return a;
    }
    if (b === undefined) {
        return a;
    }
    return new path_1.AbsoluteFilePathSet([...a, ...b]);
}
exports.mergeAbsoluteFilePathSets = mergeAbsoluteFilePathSets;
// Get an array of possible files in parent folders that will cause a project cache invalidation
function getParentConfigDependencies(path) {
    const deps = new path_1.AbsoluteFilePathSet();
    for (const folder of path.getChain()) {
        deps.add(folder.append('package.json'));
        for (const configFilename of constants_1.ROME_CONFIG_FILENAMES) {
            deps.add(folder.append(configFilename));
            deps.add(folder.append(constants_1.ROME_CONFIG_FOLDER).append(configFilename));
        }
    }
    return deps;
}
exports.getParentConfigDependencies = getParentConfigDependencies;
