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
const Bundler_1 = require("../bundler/Bundler");
const fs_1 = require("@romejs/fs");
const string_markup_1 = require("@romejs/string-markup");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.SOURCE_CODE,
    description: 'build a standalone js bundle for a package',
    usage: '',
    examples: [],
    defineFlags(consumer) {
        return {
            quiet: consumer.get('quiet').asBoolean(false),
        };
    },
    async callback(req, commandFlags) {
        const { flags } = req.client;
        const { args } = req.query;
        const { reporter } = req;
        req.expectArgumentLength(2);
        const [entryFilename, outputFolder] = args;
        const bundler = Bundler_1.default.createFromMasterRequest(req);
        const resolution = await bundler.getResolvedEntry(entryFilename);
        const { files: outFiles } = await bundler.bundleManifest(resolution);
        const savedList = [];
        const dir = flags.cwd.resolve(outputFolder);
        for (const [filename, { kind, content }] of outFiles) {
            const buff = content();
            const file = dir.append(filename);
            const loc = file.join();
            savedList.push(string_markup_1.markup `<filelink target="${loc}">${filename}</filelink> <filesize dim>${Buffer.byteLength(buff)}</filesize> <inverse>${kind}</inverse>`);
            await fs_1.createDirectory(file.getParent(), { recursive: true });
            await fs_1.writeFile(file, buff);
        }
        if (commandFlags.quiet) {
            reporter.success(string_markup_1.markup `Saved to <filelink target="${dir.join()}" />`);
        }
        else {
            reporter.success(string_markup_1.markup `Saved the following files to <filelink target="${dir.join()}" />`);
            reporter.list(savedList);
        }
    },
});
