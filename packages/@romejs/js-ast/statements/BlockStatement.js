"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.blockStatement = utils_1.createQuickBuilder('BlockStatement', 'body', {
    bindingKeys: {},
    visitorKeys: {
        body: true,
        directives: true,
    },
});
