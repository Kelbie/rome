"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUTTER = ' \u2502 ';
exports.CODE_FRAME_INDENT = '  ';
exports.CODE_FRAME_SELECTED_INDENT = `<error>\></error> `;
exports.FILENAME_INDENT = '  ';
exports.MAX_CODE_FRAME_LINES = 8;
exports.HALF_MAX_CODE_FRAME_LINES = exports.MAX_CODE_FRAME_LINES / 2;
exports.CODE_FRAME_CONTEXT_LINES = 2;
// Constants that influence truncation
exports.RAW_CODE_MAX_LENGTH = 500;
exports.MAX_PATCH_LINES = 50;
