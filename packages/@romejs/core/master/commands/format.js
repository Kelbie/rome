"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../commands");
const commands_2 = require("../../common/commands");
const path_1 = require("@romejs/path");
exports.default = commands_1.createMasterCommand({
    category: commands_2.commandCategories.INTERNAL,
    description: 'TODO',
    usage: '',
    examples: [],
    defineFlags(c) {
        return {
            allowDiagnostics: c.get('allowDiagnostics').asBoolean(false),
        };
    },
    async callback(req, flags) {
        const { reporter, master } = req;
        const { args } = req.query;
        req.expectArgumentLength(1);
        const filename = await master.resolver.resolveEntryAssertPath({
            ...req.getResolverOptionsFromFlags(),
            source: path_1.createUnknownFilePath(args[0]),
        }, { location: req.getDiagnosticPointerFromFlags({ type: 'arg', key: 0 }) });
        const res = await req.requestWorkerFormat(filename, {
            allowParserDiagnostics: flags.allowDiagnostics,
        });
        if (res === undefined) {
            reporter.error('No formatter for this file');
            return undefined;
        }
        else {
            reporter.writeAll(res.formatted);
            return res.formatted;
        }
    },
});
