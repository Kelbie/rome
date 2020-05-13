"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("@romejs/fs");
const codec_json_1 = require("@romejs/codec-json");
const load_1 = require("./load");
const diagnostics_1 = require("@romejs/diagnostics");
const utils_1 = require("./utils");
async function modifyProjectConfig(softMeta, callbacks) {
    const meta = utils_1.assertHardMeta(softMeta);
    const { configPath, configSourceSubKey: consumerSubKey } = meta;
    await callbacks.pre(meta);
    // Load the config file again
    const configFile = await fs_1.readFileText(configPath);
    const res = codec_json_1.consumeJSONExtra({
        path: configPath,
        input: configFile,
    });
    const { consumer } = res;
    if (consumerSubKey === undefined) {
        await callbacks.modify(consumer);
    }
    else {
        await callbacks.modify(consumer.get(consumerSubKey));
    }
    // Stringify the config
    let stringified;
    if (res.hasExtensions) {
        stringified = codec_json_1.stringifyJSON(res);
    }
    else {
        stringified = JSON.stringify(consumer.asUnknown(), null, '  ');
    }
    // Test if this project config doesn't result in errors
    let { diagnostics } = diagnostics_1.catchDiagnosticsSync(() => {
        // Reconsume with new stringified config
        const res = codec_json_1.consumeJSONExtra({
            path: configPath,
            input: stringified,
        });
        // Validate the new config
        load_1.normalizeProjectConfig(res, configPath, stringified, meta.projectFolder);
    });
    if (diagnostics !== undefined) {
        // Set the `code` property on relevant diagnostics since our changes don't exist on disk
        diagnostics = diagnostics.map((diag) => {
            return diag.location.filename === configPath.join()
                ? {
                    ...diag,
                    location: {
                        ...diag.location,
                        sourceText: stringified,
                    },
                }
                : diag;
        });
        throw new diagnostics_1.DiagnosticsError('Diagnostics produced while testing new project config', diagnostics);
    }
    // Write it out
    await fs_1.writeFile(configPath, stringified);
}
exports.modifyProjectConfig = modifyProjectConfig;
