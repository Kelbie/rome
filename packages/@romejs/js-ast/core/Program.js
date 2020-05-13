"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.MOCK_PROGRAM = {
    type: 'Program',
    directives: [],
    body: [],
    filename: 'unknown',
    mtime: undefined,
    interpreter: undefined,
    corrupt: false,
    sourceType: 'module',
    diagnostics: [],
    comments: [],
    syntax: [],
    hasHoistedVars: false,
};
exports.program = utils_1.createBuilder('Program', {
    bindingKeys: {},
    visitorKeys: {
        interpreter: true,
        directives: true,
        body: true,
        comments: true,
    },
});
