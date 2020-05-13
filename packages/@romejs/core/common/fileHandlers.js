"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler = require("@romejs/js-compiler");
const js_analysis_1 = require("@romejs/js-analysis");
const codec_json_1 = require("@romejs/codec-json");
const path_1 = require("@romejs/path");
const analyzeDependencies_1 = require("./types/analyzeDependencies");
const js_formatter_1 = require("@romejs/js-formatter");
function getFileHandlerExtensions(projectConfig) {
    return [...DEFAULT_HANDLERS.keys(), ...projectConfig.files.assetExtensions];
}
exports.getFileHandlerExtensions = getFileHandlerExtensions;
function getFileHandler(path, projectConfig) {
    const basename = path.getBasename();
    const match = basename.match(/\.([a-zA-Z]+)$/);
    if (match == null) {
        return { ext: '', handler: undefined };
    }
    const ext = match[1];
    let handler = DEFAULT_HANDLERS.get(ext);
    // Allow setting custom assert extensions in the project config
    if (handler === undefined && projectConfig.files.assetExtensions.includes(ext)) {
        handler = assetHandler;
    }
    return { ext, handler };
}
exports.getFileHandler = getFileHandler;
function getFileHandlerAssert(path, projectConfig) {
    const { handler, ext } = getFileHandler(path, projectConfig);
    if (handler === undefined) {
        throw new Error(`No file handler found for '${path.join()}'`);
    }
    else {
        return { handler, ext };
    }
}
exports.getFileHandlerAssert = getFileHandlerAssert;
const textHandler = {
    sourceType: 'module',
    // Mock a single default export
    // We could always just pass this through to analyzeDependencies and get the same result due to the toJavaScript call below,
    // but the return value is predictable so we inline it
    async analyzeDependencies() {
        return {
            ...analyzeDependencies_1.UNKNOWN_ANALYZE_DEPENDENCIES_RESULT,
            moduleType: 'es',
            exports: [
                {
                    type: 'local',
                    // TODO we could fake this?
                    loc: undefined,
                    kind: 'value',
                    valueType: 'other',
                    name: 'default',
                },
            ],
        };
    },
    async toJavaScript({ file, worker }) {
        const src = await worker.readFile(file.real);
        const serial = JSON.stringify(src);
        return {
            sourceText: `export default ${serial};`,
            generated: true,
        };
    },
};
exports.ASSET_EXPORT_TEMPORARY_VALUE = 'VALUE_INJECTED_BY_BUNDLER';
const assetHandler = {
    // analyzeDependencies shim
    ...textHandler,
    canHaveScale: true,
    isAsset: true,
    async toJavaScript() {
        // This exists just so analyzeDependencies has something to look at
        // When bundling we'll have custom logic in the compiler to handle assets and inject the correct string
        return {
            generated: true,
            sourceText: `export default '${exports.ASSET_EXPORT_TEMPORARY_VALUE}';`,
        };
    },
};
const jsonHandler = {
    // analyzeDependencies shim
    ...textHandler,
    async format(info) {
        const { file, worker } = info;
        const { uid } = file;
        const real = path_1.createAbsoluteFilePath(file.real);
        const sourceText = await worker.readFile(real);
        const path = path_1.createUnknownFilePath(uid);
        let formatted = sourceText;
        if (sourceText.length > 50000) {
            // Fast path for big JSON files
            codec_json_1.parseJSON({
                path,
                input: sourceText,
            });
        }
        else {
            const { consumer, comments, hasExtensions } = codec_json_1.consumeJSONExtra({
                input: sourceText,
                path,
            });
            if (hasExtensions) {
                formatted = codec_json_1.stringifyJSON({ consumer, comments });
            }
            else {
                formatted = String(JSON.stringify(consumer.asUnknown(), undefined, '  '));
            }
        }
        return {
            sourceText,
            diagnostics: [],
            suppressions: [],
            formatted,
        };
    },
    async toJavaScript({ file, worker }) {
        const src = await worker.readFile(file.real);
        // Parse the JSON to make sure it's valid
        const obj = codec_json_1.parseJSON({
            path: path_1.createUnknownFilePath(file.uid),
            input: src,
        });
        const rawJson = JSON.stringify(obj);
        const json = rawJson === undefined ? 'undefined' : rawJson;
        // TODO handle unicode newlines here
        return {
            sourceText: `export default ${json};`,
            generated: true,
        };
    },
};
// These are extensions that be implicitly tried when a file is referenced
// This is mostly for compatibility with Node.js projects. This list should not
// be extended. Explicit extensions are required in the browser for as modules and
// should be required everywhere.
// TypeScript is unfortunately included here as it produces an error if you use an
// import source with ".ts"
exports.IMPLICIT_JS_EXTENSIONS = ['js', 'ts', 'tsx', 'json'];
// Extensions that have a `lint` handler
exports.LINTABLE_EXTENSIONS = [];
// Extensions that have a `format` handler
exports.FORMATTABLE_EXTENSIONS = [];
function setHandler(ext, handler) {
    if (handler.lint !== undefined) {
        exports.LINTABLE_EXTENSIONS.push(ext);
    }
    if (handler.format !== undefined) {
        exports.FORMATTABLE_EXTENSIONS.push(ext);
    }
    DEFAULT_HANDLERS.set(ext, handler);
}
// Used when filtering files, inserted by buildJSHandler
exports.JS_EXTENSIONS = [];
function buildJSHandler(ext, syntax, sourceType) {
    exports.JS_EXTENSIONS.push(ext);
    return {
        syntax,
        sourceType,
        async analyzeDependencies({ file, worker, parseOptions }) {
            const { ast, sourceText, project, generated } = await worker.parseJS(file, parseOptions);
            worker.logger.info(`Analyzing:`, file.real);
            return worker.api.interceptAndAddGeneratedToDiagnostics(await compiler.analyzeDependencies({
                ref: file,
                ast,
                sourceText,
                project,
                options: {},
            }), generated);
        },
        async toJavaScript({ file, worker }) {
            return {
                sourceText: await worker.readFile(file.real),
                generated: false,
            };
        },
        async format(info) {
            const { file: ref, parseOptions, worker } = info;
            const { ast, sourceText, generated } = await worker.parseJS(ref, parseOptions);
            const out = js_formatter_1.formatJS(ast, {
                sourceText,
            });
            return worker.api.interceptAndAddGeneratedToDiagnostics({
                formatted: out.code,
                sourceText,
                suppressions: [],
                diagnostics: ast.diagnostics,
            }, generated);
        },
        async lint(info) {
            const { file: ref, project, parseOptions, options, worker } = info;
            const { ast, sourceText, generated } = await worker.parseJS(ref, parseOptions);
            worker.logger.info(`Linting: `, ref.real);
            // Run the compiler in lint-mode which is where all the rules are actually ran
            const res = await compiler.lint({
                applyFixes: options.applyFixes,
                ref,
                options: {
                    lint: options.compilerOptions,
                },
                ast,
                project,
                sourceText,
            });
            // Extract lint diagnostics
            let { diagnostics } = res;
            // Only enable typechecking if enabled in .romeconfig
            let typeCheckingEnabled = project.config.typeCheck.enabled === true;
            if (project.config.typeCheck.libs.has(ref.real)) {
                // don't typecheck lib files
                typeCheckingEnabled = false;
            }
            // Run type checking if necessary
            if (typeCheckingEnabled) {
                const typeCheckProvider = await worker.getTypeCheckProvider(ref.project, options.prefetchedModuleSignatures, parseOptions);
                const typeDiagnostics = await js_analysis_1.check({
                    ast,
                    provider: typeCheckProvider,
                    project,
                });
                diagnostics = [...diagnostics, ...typeDiagnostics];
            }
            return worker.api.interceptAndAddGeneratedToDiagnostics({
                suppressions: res.suppressions,
                diagnostics,
                sourceText,
                formatted: res.src,
            }, generated);
        },
    };
}
const DEFAULT_HANDLERS = new Map();
const DEFAULT_ASSET_EXTENSIONS = [
    // Images
    'png',
    'jpg',
    'jpeg',
    'gif',
    // Video
    'webm',
    'mp4',
    'm4v',
    'avi',
    'mkv',
    // Audio
    'mp3',
    // Fonts
    'woff',
    'woff2',
    'eot',
    'ttf',
    'otf',
];
for (const ext of DEFAULT_ASSET_EXTENSIONS) {
    setHandler(ext, assetHandler);
}
setHandler('html', textHandler);
setHandler('htm', textHandler);
setHandler('css', textHandler);
setHandler('txt', textHandler);
setHandler('md', textHandler);
setHandler('csv', textHandler);
setHandler('tsv', textHandler);
setHandler('js', buildJSHandler('js', ['jsx', 'flow'])); // TODO eventually remove the syntax shit
setHandler('jsx', buildJSHandler('jsx', ['jsx']));
setHandler('cjs', buildJSHandler('cjs', [], 'script'));
setHandler('mjs', buildJSHandler('mjs', [], 'module'));
setHandler('ts', buildJSHandler('ts', ['ts'], 'module'));
setHandler('tsx', buildJSHandler('tsx', ['ts', 'jsx'], 'module'));
setHandler('json', jsonHandler);
setHandler('rjson', jsonHandler);
