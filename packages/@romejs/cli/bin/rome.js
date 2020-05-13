"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
const v8_1 = require("@romejs/v8");
const cli_reporter_1 = require("@romejs/cli-reporter");
const core_1 = require("@romejs/core");
const cli_1 = require("../cli");
const master_1 = require("../master");
const testWorker_1 = require("../testWorker");
const worker_1 = require("../worker");
const fs_1 = require("@romejs/fs");
const codec_source_map_1 = require("@romejs/codec-source-map");
async function main() {
    switch (process.env.ROME_PROCESS_VERSION === core_1.VERSION &&
        process.env.ROME_PROCESS_TYPE) {
        case 'master':
            return master_1.default();
        case 'worker':
            return worker_1.default();
        case 'test-worker':
            return testWorker_1.default();
        default:
            return cli_1.default();
    }
}
v8_1.sourceMapManager.init();
v8_1.sourceMapManager.addSourceMap(core_1.BIN.join(), () => codec_source_map_1.SourceMapConsumer.fromJSON(JSON.parse(fs_1.readFileTextSync(core_1.MAP))));
diagnostics_1.catchDiagnostics(main).then(({ diagnostics }) => {
    if (diagnostics !== undefined) {
        const reporter = cli_reporter_1.Reporter.fromProcess();
        cli_diagnostics_1.printDiagnostics({
            diagnostics,
            suppressions: [],
            printerOptions: {
                reporter,
            },
        });
        process.exit(1);
    }
}).catch((err) => {
    console.error('Error thrown inside the CLI handler');
    console.error(v8_1.getErrorStructure(err).stack);
});
