"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("@romejs/path");
function convertTransportFileReference(ref) {
    return {
        ...ref,
        relative: path_1.createRelativeFilePath(ref.relative),
        real: path_1.createAbsoluteFilePath(ref.real),
    };
}
exports.convertTransportFileReference = convertTransportFileReference;
