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
const project_1 = require("@romejs/project");
const path_1 = require("@romejs/path");
const string_markup_1 = require("@romejs/string-markup");
const diagnostics_1 = require("@romejs/diagnostics");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.PROJECT_MANAGEMENT,
    description: 'Modify a project config',
    usage: '(enable|disable|set) key [value]',
    examples: [
        {
            command: 'set name my_awesome_project',
            description: 'Set the project name',
        },
    ],
    defineFlags() {
        return {};
    },
    async callback(req) {
        const { reporter } = req;
        req.expectArgumentLength(2, 3);
        const project = await req.assertClientCwdProject();
        let keyParts;
        let value;
        const [action, ...restArgs] = req.query.args;
        switch (action) {
            case 'enable': {
                req.expectArgumentLength(2);
                keyParts = req.query.args[1];
                value = true;
                break;
            }
            case 'disable': {
                req.expectArgumentLength(2);
                keyParts = req.query.args[1];
                value = false;
                break;
            }
            case 'set-directory': {
                req.expectArgumentLength(3);
                [keyParts, value] = restArgs;
                // If the value is an absolute path, then make it relative to the project folder
                const path = path_1.createUnknownFilePath(value);
                if (path.isAbsolute()) {
                    value = project_1.assertHardMeta(project.meta).projectFolder.relative(path).join();
                }
                break;
            }
            case 'set': {
                req.expectArgumentLength(3);
                [keyParts, value] = restArgs;
                break;
            }
            default:
                throw req.throwDiagnosticFlagError({
                    description: diagnostics_1.descriptions.FLAGS.UNKNOWN_ACTION(action),
                    target: {
                        type: 'arg',
                        key: 0,
                    },
                });
        }
        try {
            await project_1.modifyProjectConfig(project.meta, {
                pre: (meta) => {
                    reporter.success(string_markup_1.markup `Setting <emphasis>${keyParts}</emphasis> to <emphasis>${JSON.stringify(value)}</emphasis> in the project config <filelink emphasis target="${meta.configPath.join()}" />`);
                    if (value === 'true' || value === 'false') {
                        const suggestedCommand = value === 'true' ? 'enable' : 'disable';
                        reporter.warn(string_markup_1.markup `Value is the string <emphasis>${value}</emphasis> but it looks like a boolean. You probably meant to use the command:`);
                        reporter.command(string_markup_1.markup `config ${suggestedCommand} ${keyParts}`);
                    }
                },
                modify: (consumer) => {
                    // Set the specified value
                    let keyConsumer = consumer;
                    for (const key of keyParts.split('.')) {
                        if (!keyConsumer.exists()) {
                            keyConsumer.setValue({});
                        }
                        keyConsumer = keyConsumer.get(key);
                    }
                    keyConsumer.setValue(value);
                },
            });
        }
        catch (err) {
            reporter.error('Error occured while testing new project config. Your changes have not been saved.');
            throw err;
        }
    },
});
