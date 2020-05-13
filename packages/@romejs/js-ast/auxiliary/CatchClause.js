"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.catchClause = utils_1.createBuilder('CatchClause', {
    bindingKeys: {
        param: true,
    },
    visitorKeys: {
        param: true,
        body: true,
    },
});
