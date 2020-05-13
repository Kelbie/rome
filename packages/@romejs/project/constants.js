"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROME_CONFIG_PACKAGE_JSON_FIELD = 'rome';
exports.ROME_CONFIG_FOLDER = '.config';
exports.ROME_CONFIG_FILENAMES = ['rome.json', 'rome.rjson'];
exports.ROME_CONFIG_WARN_FILENAMES = [
    'romeconfig',
    'romerc',
    'rome.son',
    'rome.config.ts',
    'rome.config.js',
    'rome.config.json',
    'rome.config.rjson',
    'rome.config.son',
];
// Add dot versions
for (const basename of exports.ROME_CONFIG_WARN_FILENAMES) {
    if (basename[0] !== '.') {
        exports.ROME_CONFIG_WARN_FILENAMES.push(`.${basename}`);
    }
}
for (const filename of exports.ROME_CONFIG_FILENAMES.slice()) {
    exports.ROME_CONFIG_FILENAMES.push(`.${filename}`);
}
