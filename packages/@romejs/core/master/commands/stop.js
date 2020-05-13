"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.PROCESS_MANAGEMENT,
    description: 'stop daemon',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback({ master }) {
        master.end();
    },
});
