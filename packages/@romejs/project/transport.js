"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("@romejs/path");
function serializeJSONProjectConfig(config) {
    const targets = {};
    for (const [name, target] of config.targets) {
        targets[name] = target;
    }
    return {
        ...config,
        vcs: {
            ...config.vcs,
            root: config.vcs.root.join(),
        },
        typeCheck: {
            ...config.typeCheck,
            libs: Array.from(config.typeCheck.libs, (path) => path.join()),
        },
        files: {
            ...config.files,
            vendorPath: config.files.vendorPath.join(),
        },
        targets,
    };
}
exports.serializeJSONProjectConfig = serializeJSONProjectConfig;
function hydrateJSONProjectConfig(config) {
    return {
        ...config,
        files: {
            ...config.files,
            vendorPath: path_1.createAbsoluteFilePath(config.files.vendorPath),
        },
        vcs: {
            ...config.vcs,
            root: path_1.createAbsoluteFilePath(config.vcs.root),
        },
        typeCheck: {
            ...config.typeCheck,
            libs: new path_1.AbsoluteFilePathSet(config.typeCheck.libs.map((str) => path_1.createAbsoluteFilePath(str))),
        },
        targets: new Map(Object.entries(config.targets)),
    };
}
exports.hydrateJSONProjectConfig = hydrateJSONProjectConfig;
