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
const diagnostics_1 = require("@romejs/diagnostics");
const path_1 = require("@romejs/path");
const Bundler_1 = require("../bundler/Bundler");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.SOURCE_CODE,
    description: 'compile a single file',
    usage: '',
    examples: [],
    defineFlags(c) {
        return {
            bundle: c.get('bundle').asBoolean(false),
        };
    },
    async callback(req, commandFlags) {
        const { master, reporter } = req;
        const { args } = req.query;
        req.expectArgumentLength(1);
        const resolved = await master.resolver.resolveEntryAssert({
            ...req.getResolverOptionsFromFlags(),
            source: path_1.createUnknownFilePath(args[0]),
        }, { location: req.getDiagnosticPointerFromFlags({ type: 'arg', key: 0 }) });
        let res;
        if (commandFlags.bundle) {
            const bundler = Bundler_1.default.createFromMasterRequest(req);
            res = await bundler.compile(resolved.path);
        }
        else {
            res = await req.requestWorkerCompile(resolved.path, 'compile', {}, {});
        }
        const { compiledCode, diagnostics, suppressions } = res;
        if (diagnostics.length > 0) {
            throw new diagnostics_1.DiagnosticsError('Compile diagnostics', diagnostics, suppressions);
        }
        reporter.writeAll(compiledCode);
    },
});
