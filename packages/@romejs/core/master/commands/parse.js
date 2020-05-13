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
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.SOURCE_CODE,
    description: 'parse a single file and dump its ast',
    usage: '',
    examples: [],
    defineFlags(c) {
        return {
            allowDiagnostics: c.get('allowDiagnostics').asBoolean(false),
            compact: c.get('compact').asBoolean(true),
            sourceType: c.get('sourceType').asStringSetOrVoid(['module', 'script']),
        };
    },
    async callback(req, flags) {
        const { master, reporter } = req;
        const { args } = req.query;
        req.expectArgumentLength(1);
        const filename = await master.resolver.resolveEntryAssertPath({
            ...req.getResolverOptionsFromFlags(),
            source: path_1.createUnknownFilePath(args[0]),
        }, { location: req.getDiagnosticPointerFromFlags({ type: 'arg', key: 0 }) });
        let ast = await req.requestWorkerParse(filename, {
            sourceType: flags.sourceType,
            allowParserDiagnostics: flags.allowDiagnostics,
        });
        if (flags.compact) {
            ast = js_ast_1.program.assert(js_ast_utils_1.removeLoc(ast));
        }
        reporter.inspect(ast);
    },
});
