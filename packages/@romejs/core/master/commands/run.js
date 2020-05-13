"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Bundler_1 = require("../bundler/Bundler");
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
const path_1 = require("@romejs/path");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    description: 'TODO',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { args } = req.query;
        const { flags } = req.client;
        const { master } = req;
        req.expectArgumentLength(1);
        async function executeCode(path) {
            const bundler = Bundler_1.default.createFromMasterRequest(req);
            const { entry } = await bundler.bundle(path);
            return {
                type: 'executeCode',
                filename: path.join(),
                code: entry.js.content,
                map: entry.sourceMap.map.serialize(),
            };
        }
        // Get the current project
        const project = await master.projectManager.findProject(flags.cwd);
        // check for absolute paths
        const target = args[0];
        const resolved = await master.resolver.resolveEntry({
            ...req.getResolverOptionsFromFlags(),
            source: path_1.createRelativeFilePath(target),
        });
        if (resolved.type === 'FOUND') {
            return executeCode(resolved.path);
        }
        // check for bin files in any manifests that belong to any projects
        if (project !== undefined) {
            for (const { manifest, folder } of project.packages.values()) {
                const relative = manifest.bin.get(target);
                if (relative === undefined) {
                    continue;
                }
                const resolved = await master.resolver.resolveEntryAssertPath({
                    ...req.getResolverOptionsFromFlags(),
                    origin: folder,
                    platform: 'node',
                    source: path_1.createRelativeFilePath(relative),
                });
                return executeCode(resolved);
            }
        }
        // TODO check node_modules/.bin
        // TODO check package.json scripts
        throw new Error(`Failed to find "${target}"`);
    },
});
