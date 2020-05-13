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
    category: commands_1.commandCategories.SOURCE_CODE,
    description: 'resolve a file',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { master, reporter } = req;
        const { args } = req.query;
        const { flags } = req.client;
        req.expectArgumentLength(1, 2);
        let origin;
        let relative = '';
        let key;
        if (args.length === 2) {
            origin = flags.cwd.resolveMaybeUrl(args[0]);
            relative = args[1];
            key = 1;
        }
        else {
            origin = flags.cwd;
            relative = args[0];
            key = 0;
        }
        const query = {
            ...req.getResolverOptionsFromFlags(),
            origin,
            source: path_1.createUnknownFilePath(relative),
        };
        const resolved = await master.resolver.resolveEntryAssert(query, {
            location: req.getDiagnosticPointerFromFlags({ type: 'arg', key }),
        });
        const filename = resolved.ref.real.join();
        reporter.logAll(filename);
        return filename;
    },
});
