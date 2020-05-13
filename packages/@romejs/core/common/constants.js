"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = require("../../../../package.json");
const os = require("os");
const path_1 = require("@romejs/path");
exports.CHILD_ARGS = ['--max-old-space-size=8192'];
// @ts-ignore: this will be wrong if we weren't the entry node script
exports.BIN = path_1.createAbsoluteFilePath(process.mainModule.filename);
exports.MAP = exports.BIN.addExtension('.map');
const MEGABYTE = 10000;
exports.MAX_MASTER_BYTES_BEFORE_WORKERS = 0.5 * MEGABYTE;
exports.MAX_WORKER_BYTES_BEFORE_ADD = 1 * MEGABYTE;
const CPU_COUNT = os.cpus().length;
exports.MAX_WORKER_COUNT = Math.min(CPU_COUNT, 4);
exports.VERSION = String(package_json_1.default.version);
exports.SOCKET_PATH = path_1.TEMP_PATH.append(`rome-${exports.VERSION}.sock`);
exports.CLI_SOCKET_PATH = path_1.TEMP_PATH.append(`rome-wait-${exports.VERSION}.sock`);
exports.MOCKS_FOLDER_NAME = '__rmocks__';
