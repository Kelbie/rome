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
const consume_1 = require("@romejs/consume");
const executeMain_1 = require("../../common/utils/executeMain");
const path_1 = require("@romejs/path");
const diagnostics_1 = require("@romejs/diagnostics");
const codec_source_map_1 = require("@romejs/codec-source-map");
exports.default = commands_2.createLocalCommand({
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    description: 'TODO',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const bridge = await req.client.findOrStartMaster();
        if (bridge === undefined) {
            return false;
        }
        process.on('unhandledRejection', (error) => {
            error;
            //console.log('unhandledRejection', error.stack);
        });
        const res = await req.client.query({
            commandName: 'run',
            args: req.query.args,
        }, 'master');
        if (res.type !== 'SUCCESS') {
            return false;
        }
        const data = consume_1.consumeUnknown(res.data, 'parse/json');
        if (data.exists()) {
            const type = data.get('type').asString();
            switch (type) {
                case 'executeCode': {
                    process.execArgv = [...process.execArgv, process.argv[1], 'run'];
                    process.argv = [
                        process.argv[0],
                        String(data.filename),
                        ...process.argv.slice(4),
                    ];
                    const { syntaxError } = await executeMain_1.default({
                        path: path_1.createAbsoluteFilePath(data.get('filename').asString()),
                        code: data.get('code').asString(),
                        sourceMap: codec_source_map_1.SourceMapConsumer.fromJSON(data.get('map').asAny()),
                    });
                    if (syntaxError !== undefined) {
                        throw diagnostics_1.createSingleDiagnosticError(syntaxError);
                    }
                    await new Promise(() => { });
                    break;
                }
            }
        }
        return true;
    },
});
