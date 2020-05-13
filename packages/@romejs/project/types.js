"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("@romejs/path");
exports.DEFAULT_PROJECT_CONFIG_META = {
    projectFolder: undefined,
    configPath: undefined,
    configHashes: [],
    configDependencies: new path_1.AbsoluteFilePathSet(),
    consumer: undefined,
    configSourceSubKey: undefined,
    consumersChain: [],
};
exports.DEFAULT_PROJECT_CONFIG = {
    name: 'unknown',
    root: false,
    version: undefined,
    cache: {},
    develop: {
        serveStatic: true,
    },
    bundler: {
        mode: 'modern',
    },
    compiler: {},
    resolver: {},
    typeCheck: {
        enabled: false,
        // Maybe this needs to be cloned...?
        libs: new path_1.AbsoluteFilePathSet(),
    },
    dependencies: {
        enabled: false,
    },
    lint: {
        ignore: [],
        globals: [],
    },
    tests: {
        ignore: [],
    },
    vcs: {
        root: path_1.createAbsoluteFilePath('/'),
    },
    files: {
        vendorPath: path_1.TEMP_PATH.append(`rome-remote`),
        assetExtensions: [],
        maxSize: 40000000,
    },
    targets: new Map(),
};
