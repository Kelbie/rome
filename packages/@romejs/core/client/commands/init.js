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
const fs_1 = require("@romejs/fs");
const constants_1 = require("../../common/constants");
exports.default = commands_2.createLocalCommand({
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    description: 'create a project config',
    usage: '',
    examples: [],
    defineFlags(consumer) {
        return {
            defaults: consumer.get('defaults').asBoolean(false),
        };
    },
    async callback(req, flags) {
        const { reporter } = req.client;
        const config = {};
        const configPath = req.client.flags.cwd.append('rome.json');
        if (await fs_1.exists(configPath)) {
            reporter.error(`<filelink target="${configPath.join()}" emphasis>rome.json</filelink> file already exists`);
            reporter.info('Use <command>rome config</command> to update an existing config');
            return false;
        }
        reporter.heading('Welcome to Rome!');
        if (flags.defaults === false) {
            const useDefaults = await reporter.radioConfirm('Use recommended settings?');
            if (useDefaults) {
                flags = { defaults: true };
            }
        }
        const name = await reporter.question('Project name', {
            yes: flags.defaults,
        });
        if (name !== '') {
            config.name = name;
        }
        config.version = `^${constants_1.VERSION}`;
        await fs_1.writeFile(configPath, `${JSON.stringify(config, null, '  ')}\n`);
        reporter.success(`Created config <filelink emphasis target="${configPath.join()}" />`);
        return true;
    },
});
