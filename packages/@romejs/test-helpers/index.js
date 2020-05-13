"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const consume_1 = require("@romejs/consume");
const codec_json_1 = require("@romejs/codec-json");
const rome_1 = require("@romejs-runtime/rome");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
const dirname = rome_1.testOptions.dirname === undefined ? '' : rome_1.testOptions.dirname;
async function isFile(path) {
    return (await fs_1.lstat(path)).isFile();
}
async function getOptions(dir) {
    const optionsLoc = dir.append('options.json');
    const input = await fs_1.readFileText(optionsLoc);
    return codec_json_1.consumeJSON({
        input,
        path: optionsLoc,
    });
}
async function _getFixtures(opts) {
    const { name, dir, parts, options: inheritOptions } = opts;
    // Check if directory even exists
    if (!(await fs_1.exists(dir))) {
        throw new Error(`The directory ${dir} doesn't exist`);
    }
    // If the name starts with a dot then we're hidden
    if (name !== undefined && name[0] === '.') {
        return [];
    }
    // Get all the filenames in the directory
    const filenames = await fs_1.readdir(dir);
    // Get options for this folder
    let ownOptions;
    if (filenames.has(dir.append('options.json'))) {
        ownOptions = await getOptions(dir);
    }
    // Merge options
    const options = ownOptions === undefined
        ? inheritOptions
        : consume_1.consumeUnknown({
            ...inheritOptions.asUnknownObject(),
            ...ownOptions.asUnknownObject(),
        }, 'tests/fixtureOptions');
    // An array of folders names that lead to this fixture
    const ownParts = name === undefined ? parts : [...parts, name];
    // Split up all files and folders
    const folders = new Set();
    const files = new Set();
    for (const path of filenames) {
        if (await isFile(path)) {
            files.add(path);
        }
        else {
            folders.add(path);
        }
    }
    // If there's any folders then get the fixtures from 'all of them
    if (folders.size > 0) {
        let fixtures = [];
        for (const path of folders) {
            fixtures = fixtures.concat(await _getFixtures({
                name: path.getBasename(),
                dir: path,
                parts: ownParts,
                options,
            }));
        }
        return fixtures;
    }
    // Get the contents of all the files
    const fileContents = new Map();
    for (const path of filenames) {
        fileContents.set(path.getBasename(), {
            relative: dir.relative(path),
            absolute: path,
            content: await fs_1.readFile(path),
        });
    }
    // Create the fixture
    return [
        {
            name: ownParts,
            dir,
            options,
            files: fileContents,
        },
    ];
}
async function getFixtures(dir) {
    return _getFixtures({
        name: undefined,
        dir: path_1.createAbsoluteFilePath(dir).append('test-fixtures'),
        parts: [],
        options: consume_1.consumeUnknown({}, 'tests/fixtureOptions'),
    });
}
exports.getFixtures = getFixtures;
async function createFixtureTests(callback, dir = dirname) {
    for (const fixture of await getFixtures(dir)) {
        rome_1.test(fixture.name, {}, async (t) => {
            t.addToAdvice({
                type: 'log',
                category: 'info',
                text: 'Fixture options',
            });
            t.addToAdvice({
                type: 'inspect',
                data: fixture.options.asJSONPropertyValue(),
            });
            t.addToAdvice({
                type: 'log',
                category: 'info',
                text: 'Fixture files',
            });
            t.addToAdvice({
                type: 'list',
                list: Array.from(fixture.files, ([basename, info]) => `<filelink target="${info.absolute}">${basename}</filelink>`),
            });
            await callback(fixture, t);
        });
    }
}
exports.createFixtureTests = createFixtureTests;
