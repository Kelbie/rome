"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const path_match_1 = require("@romejs/path-match");
const utils_1 = require("./utils");
const codec_json_1 = require("@romejs/codec-json");
const path_1 = require("@romejs/path");
const fs_1 = require("@romejs/fs");
const crypto = require("crypto");
const constants_1 = require("./constants");
const codec_semver_1 = require("@romejs/codec-semver");
const diagnostics_1 = require("@romejs/diagnostics");
const IGNORE_FILENAMES = ['.gitignore', '.hgignore'];
function categoryExists(consumer) {
    if (!consumer.exists()) {
        return false;
    }
    const value = consumer.asUnknown();
    if (typeof value === 'boolean') {
        consumer.unexpected(diagnostics_1.descriptions.PROJECT_CONFIG.BOOLEAN_CATEGORY(value));
        return false;
    }
    return true;
}
function loadCompleteProjectConfig(projectFolder, configPath) {
    // TODO use consumer.capture somehow here to aggregate errors
    const { partial, meta } = loadPartialProjectConfig(projectFolder, configPath);
    const { consumer } = meta;
    // Produce a defaultConfig with some folder specific values
    const defaultConfig = {
        ...types_1.DEFAULT_PROJECT_CONFIG,
        vcs: {
            ...types_1.DEFAULT_PROJECT_CONFIG.vcs,
            root: projectFolder,
        },
    };
    const name = consumer.get('name').asString(`project-${projectFolder.getBasename()}`);
    const config = {
        ...types_1.DEFAULT_PROJECT_CONFIG,
        name,
        root: partial.root === undefined
            ? types_1.DEFAULT_PROJECT_CONFIG.root
            : partial.root,
        ...mergePartialConfig(defaultConfig, partial),
    };
    // Infer VCS ignore files as lint ignore rules
    for (const filename of IGNORE_FILENAMES) {
        const possiblePath = config.vcs.root.append(filename);
        meta.configDependencies.add(possiblePath);
        if (fs_1.existsSync(possiblePath)) {
            const file = fs_1.readFileTextSync(possiblePath);
            consumer.handleThrownDiagnostics(() => {
                const patterns = path_match_1.parsePathPatternsFile({
                    input: file,
                    path: possiblePath,
                });
                // TODO: Maybe these are useful in other places?
                config.lint.ignore = [...config.lint.ignore, ...patterns];
            });
        }
    }
    return {
        config,
        meta,
    };
}
exports.loadCompleteProjectConfig = loadCompleteProjectConfig;
function loadPartialProjectConfig(projectFolder, configPath) {
    const configFile = fs_1.readFileTextSync(configPath);
    const res = codec_json_1.consumeJSONExtra({
        path: configPath,
        input: configFile,
    });
    return normalizeProjectConfig(res, configPath, configFile, projectFolder);
}
function normalizeProjectConfig(res, configPath, configFile, projectFolder) {
    let { consumer } = res;
    let configSourceSubKey;
    let name;
    const isInPackageJson = configPath.getBasename() === 'package.json';
    if (isInPackageJson) {
        // Infer name from package.json
        name = consumer.get('name').asStringOrVoid();
        consumer = consumer.get(constants_1.ROME_CONFIG_PACKAGE_JSON_FIELD);
        configSourceSubKey = constants_1.ROME_CONFIG_PACKAGE_JSON_FIELD;
    }
    const hash = crypto.createHash('sha256').update(configFile).digest('hex');
    const config = {
        compiler: {},
        bundler: {},
        cache: {},
        lint: {},
        resolver: {},
        develop: {},
        typeCheck: {},
        tests: {},
        files: {},
        vcs: {},
        dependencies: {},
        targets: new Map(),
    };
    if (name !== undefined) {
        config.name = name;
    }
    const meta = {
        projectFolder,
        configPath,
        consumer,
        consumersChain: [consumer],
        configHashes: [hash],
        configSourceSubKey,
        configDependencies: utils_1.getParentConfigDependencies(projectFolder),
    };
    // We never use `name` here but it's used in `loadCompleteProjectConfig`
    consumer.markUsedProperty('name');
    if (consumer.has('version')) {
        const version = consumer.get('version');
        consumer.handleThrownDiagnostics(() => {
            config.version = codec_semver_1.parseSemverRange({
                path: consumer.filename,
                input: version.asString(),
                offsetPosition: version.getLocation('inner-value').start,
            });
            // TODO verify that config.version range satisfies current version
        });
    }
    if (consumer.has('root')) {
        config.root = consumer.get('root').asBoolean();
    }
    const cache = consumer.get('cache');
    if (categoryExists(cache)) {
        // TODO
    }
    const resolver = consumer.get('resolver');
    if (categoryExists(resolver)) {
        // TODO
    }
    const bundler = consumer.get('bundler');
    if (categoryExists(bundler)) {
        if (bundler.has('mode')) {
            config.bundler.mode = bundler.get('mode').asStringSetOrVoid([
                'modern',
                'legacy',
            ]);
        }
    }
    const typeChecking = consumer.get('typeChecking');
    if (categoryExists(typeChecking)) {
        if (typeChecking.has('enabled')) {
            config.typeCheck.enabled = typeChecking.get('enabled').asBoolean();
        }
        if (typeChecking.has('libs')) {
            const libs = normalizeTypeCheckingLibs(projectFolder, typeChecking.get('libs'));
            config.typeCheck.libs = libs.files;
            meta.configDependencies = new path_1.AbsoluteFilePathSet([
                ...meta.configDependencies,
                ...libs.folders,
                ...libs.files,
            ]);
        }
    }
    const dependencies = consumer.get('dependencies');
    if (categoryExists(dependencies)) {
        if (dependencies.has('enabled')) {
            config.dependencies.enabled = dependencies.get('dependencies').asBoolean();
        }
    }
    const lint = consumer.get('lint');
    if (categoryExists(lint)) {
        if (lint.has('ignore')) {
            config.lint.ignore = utils_1.arrayOfPatterns(lint.get('ignore'));
        }
        if (lint.has('globals')) {
            config.lint.globals = utils_1.arrayOfStrings(lint.get('globals'));
        }
    }
    const tests = consumer.get('tests');
    if (categoryExists(tests)) {
        if (tests.has('ignore')) {
            config.tests.ignore = utils_1.arrayOfPatterns(tests.get('ignore'));
        }
    }
    const develop = consumer.get('develop');
    if (categoryExists(develop)) {
        if (develop.has('serveStatic')) {
            config.develop.serveStatic = develop.get('serveStatic').asBoolean();
        }
    }
    const files = consumer.get('files');
    if (categoryExists(files)) {
        if (files.has('vendorPath')) {
            config.files.vendorPath = projectFolder.resolve(files.get('vendorPath').asString());
        }
        if (files.has('maxSize')) {
            config.files.maxSize = files.get('maxSize').asNumber();
        }
        if (files.has('assetExtensions')) {
            config.files.assetExtensions = files.get('assetExtensions').asArray().map((item) => item.asString());
        }
    }
    const vcs = consumer.get('vcs');
    if (categoryExists(vcs)) {
        if (vcs.has('root')) {
            config.vcs.root = projectFolder.resolve(vcs.get('root').asString());
        }
    }
    const compiler = consumer.get('compiler');
    if (categoryExists(compiler)) {
        // TODO
    }
    const targets = consumer.get('targets');
    if (categoryExists(targets)) {
        for (const [name, object] of targets.asMap()) {
            const target = {
                constraints: object.get('constraints').asImplicitArray().map((item) => item.asString()),
            };
            object.enforceUsedProperties('config target property');
            config.targets.set(name, target);
        }
    }
    // Need to get this before enforceUsedProperties so it will be flagged
    const _extends = consumer.get('extends');
    // Flag unknown properties
    consumer.enforceUsedProperties('config property');
    if (_extends.exists()) {
        return extendProjectConfig(projectFolder, _extends, config, meta);
    }
    return {
        partial: config,
        meta,
    };
}
exports.normalizeProjectConfig = normalizeProjectConfig;
function normalizeTypeCheckingLibs(projectFolder, consumer) {
    const libFiles = new path_1.AbsoluteFilePathSet();
    // Normalize library folders
    const folders = utils_1.arrayOfStrings(consumer).map((libFolder) => projectFolder.resolve(libFolder));
    // Crawl library folders and add their files
    for (const folder of folders) {
        const files = fs_1.readdirSync(folder);
        for (const file of files) {
            const stats = fs_1.lstatSync(file);
            if (stats.isFile()) {
                libFiles.add(file);
            }
            else if (stats.isDirectory()) {
                folders.push(file);
            }
        }
    }
    return {
        files: libFiles,
        folders,
    };
}
function extendProjectConfig(projectFolder, extendsStrConsumer, config, meta) {
    const extendsRelative = extendsStrConsumer.asString();
    if (extendsRelative === 'parent') {
        // TODO maybe do some magic here?
    }
    const extendsPath = projectFolder.resolve(extendsRelative);
    const { partial: extendsObj, meta: extendsMeta } = loadPartialProjectConfig(extendsPath.getParent(), extendsPath);
    // Check for recursive config
    for (const path of extendsMeta.configDependencies) {
        if (path.equal(extendsPath)) {
            throw extendsStrConsumer.unexpected(diagnostics_1.descriptions.PROJECT_CONFIG.RECURSIVE_CONFIG);
        }
    }
    const merged = mergePartialConfig(extendsObj, config);
    const lintIgnore = utils_1.mergeArrays(extendsObj.lint.ignore, config.lint.ignore);
    if (lintIgnore !== undefined) {
        merged.lint.ignore = lintIgnore;
    }
    const lintGlobals = utils_1.mergeArrays(extendsObj.lint.globals, config.lint.globals);
    if (lintGlobals !== undefined) {
        merged.lint.globals = lintGlobals;
    }
    const testingIgnore = utils_1.mergeArrays(extendsObj.tests.ignore, config.tests.ignore);
    if (testingIgnore !== undefined) {
        merged.tests.ignore = testingIgnore;
    }
    const typeCheckingLibs = utils_1.mergeAbsoluteFilePathSets(extendsObj.typeCheck.libs, config.typeCheck.libs);
    if (typeCheckingLibs !== undefined) {
        merged.typeCheck.libs = typeCheckingLibs;
    }
    return {
        partial: merged,
        meta: {
            ...meta,
            consumersChain: [...meta.consumersChain, ...extendsMeta.consumersChain],
            configDependencies: new path_1.AbsoluteFilePathSet([
                ...meta.configDependencies,
                ...extendsMeta.configDependencies,
                extendsPath,
            ]),
            configHashes: [...meta.configHashes, ...extendsMeta.configHashes],
        },
    };
}
function mergePartialConfig(a, b) {
    return {
        cache: {
            ...a.cache,
            ...b.cache,
        },
        compiler: {
            ...a.compiler,
            ...b.compiler,
        },
        lint: {
            ...a.lint,
            ...b.lint,
        },
        develop: {
            ...a.develop,
            ...b.develop,
        },
        bundler: {
            ...a.bundler,
            ...b.bundler,
        },
        dependencies: {
            ...a.dependencies,
            ...b.dependencies,
        },
        resolver: {
            ...a.resolver,
            ...b.resolver,
        },
        typeCheck: {
            ...a.typeCheck,
            ...b.typeCheck,
        },
        tests: {
            ...a.tests,
            ...b.tests,
        },
        files: {
            ...a.files,
            ...b.files,
        },
        vcs: {
            ...a.vcs,
            ...b.vcs,
        },
        targets: new Map([...a.targets.entries(), ...b.targets.entries()]),
    };
}
