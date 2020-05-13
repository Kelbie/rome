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
const path_1 = require("@romejs/path");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.INTERNAL,
    description: 'get the module type signature of a file',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { master, reporter } = req;
        const { args } = req.query;
        req.expectArgumentLength(1);
        const filename = await master.resolver.resolveEntryAssertPath({
            ...req.getResolverOptionsFromFlags(),
            source: path_1.createUnknownFilePath(args[0]),
        }, { location: req.getDiagnosticPointerFromFlags({ type: 'arg', key: 0 }) });
        reporter.inspect(await req.requestWorkerModuleSignature(filename, {}));
    },
});
