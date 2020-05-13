"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const codec_json_1 = require("@romejs/codec-json");
const constants_1 = require("./constants");
const project_1 = require("@romejs/project");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
const VERSION_PATH = path_1.TEMP_PATH.append(`rome-${constants_1.VERSION}`);
exports.DEFAULT_USER_CONFIG = {
    runtimeModulesPath: VERSION_PATH.append('runtime'),
    cachePath: VERSION_PATH.append('cache'),
};
function loadUserConfig() {
    for (const configFilename of project_1.ROME_CONFIG_FILENAMES) {
        const configPath = path_1.HOME_PATH.append(['.config', configFilename]);
        if (!fs_1.existsSync(configPath)) {
            continue;
        }
        const configFile = fs_1.readFileTextSync(configPath);
        const consumer = codec_json_1.consumeJSON({
            path: configPath,
            input: configFile,
        });
        const userConfig = {
            ...exports.DEFAULT_USER_CONFIG,
        };
        if (consumer.has('cachePath')) {
            userConfig.cachePath = path_1.createAbsoluteFilePath(consumer.get('cachePath').asString());
        }
        if (consumer.has('runtimeModulesPath')) {
            userConfig.runtimeModulesPath = path_1.createAbsoluteFilePath(consumer.get('runtimeModulesPath').asString());
        }
        consumer.enforceUsedProperties('config property');
        return userConfig;
    }
    return exports.DEFAULT_USER_CONFIG;
}
exports.loadUserConfig = loadUserConfig;
