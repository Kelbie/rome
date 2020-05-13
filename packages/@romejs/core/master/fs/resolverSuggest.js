"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Resolver_1 = require("./Resolver");
const diagnostics_1 = require("@romejs/diagnostics");
const string_utils_1 = require("@romejs/string-utils");
const path_1 = require("@romejs/path");
const platform_1 = require("../../common/types/platform");
const string_markup_1 = require("@romejs/string-markup");
function resolverSuggest(resolver, query, resolved, origQuerySource) {
    let errMsg = '';
    if (resolved.type === 'UNSUPPORTED') {
        errMsg = `Unsupported path format`;
    }
    else if (resolved.type === 'MISSING') {
        errMsg = `Cannot find`;
    }
    else if (resolved.type === 'FETCH_ERROR') {
        errMsg = 'Failed to fetch';
    }
    errMsg += ` "${query.source.join()}" from "${query.origin.join()}"`;
    // Use the querySource returned by the resolution which will be the one that actually triggered this error, otherwise use the query source provided to us
    const querySource = resolved.source === undefined ? origQuerySource : resolved.source;
    if (querySource === undefined || querySource.location === undefined) {
        // TODO do something about the `advice` on some `resolved` that may contain metadata?
        throw new Error(errMsg);
    }
    const { location } = querySource;
    let advice = [];
    if (query.origin.isAbsolute()) {
        const localQuery = {
            ...query,
            origin: query.origin.assertAbsolute(),
        };
        // Provide advice in strict-mode if a non-strict version existed
        if (query.strict) {
            const nonStrictResolved = resolver.resolveLocal({
                ...localQuery,
                strict: false,
            });
            if (nonStrictResolved.type === 'FOUND') {
                if (nonStrictResolved.types.includes('implicitIndex')) {
                    advice.push({
                        type: 'log',
                        category: 'info',
                        text: `This successfully resolves as an implicit index file. Trying adding <emphasis>/index${nonStrictResolved.path.getExtensions()}</emphasis> to the end of the import source`,
                    });
                }
                else if (nonStrictResolved.types.includes('implicitExtension')) {
                    advice.push({
                        type: 'log',
                        category: 'info',
                        text: `This successfully resolves as an implicit extension. Try adding the extension <emphasis>${nonStrictResolved.path.getExtensions()}</emphasis>`,
                    });
                }
            }
        }
        // We may set this to `true` for stuff like forgetting a platform
        let skipSimilaritySuggestions = false;
        // Try other platforms
        const validPlatforms = [];
        for (const PLATFORM of platform_1.PLATFORMS) {
            if (PLATFORM === query.platform) {
                continue;
            }
            const resolved = resolver.resolveLocal({
                ...localQuery,
                platform: PLATFORM,
            });
            if (resolved.type === 'FOUND') {
                validPlatforms.push(string_markup_1.markup `<emphasis>${PLATFORM}</emphasis> at <filelink emphasis target="${resolved.ref.uid}" />`);
            }
        }
        if (validPlatforms.length > 0) {
            if (query.platform === undefined) {
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: 'No platform was specified but we found modules for the following platforms',
                });
            }
            else {
                advice.push({
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `No module found for the platform <emphasis>${query.platform}</emphasis> but we found these others`,
                });
            }
            skipSimilaritySuggestions = true;
            advice.push({
                type: 'list',
                list: validPlatforms,
            });
        }
        // Hint on any indirection
        if (origQuerySource !== undefined &&
            origQuerySource.location !== undefined &&
            resolved.source !== undefined) {
            advice.push({
                type: 'log',
                category: 'info',
                text: `Found while resolving <emphasis>${query.source}</emphasis> from <filelink emphasis target="${query.origin}" />`,
            });
            const origPointer = origQuerySource.location;
            advice.push({
                type: 'frame',
                location: origPointer,
            });
        }
        // Suggestions based on similarity to paths and packages on disk
        if (!skipSimilaritySuggestions) {
            const suggestions = getSuggestions(resolver, localQuery);
            if (suggestions.size > 0) {
                const originFolder = resolver.getOriginFolder(localQuery);
                // Relative paths to absolute
                const relativeToAbsolute = new Map();
                const relativeSuggestions = Array.from(suggestions, ([human, absolute]) => {
                    if (human !== absolute) {
                        relativeToAbsolute.set(human, absolute);
                        return human;
                    }
                    let relativePath = originFolder.relative(absolute);
                    // If the user didn't use extensions, then neither should we
                    if (!query.source.hasExtensions()) {
                        // TODO only do this if it's an implicit extension
                        relativePath = relativePath.changeBasename(relativePath.getExtensionlessBasename());
                    }
                    const relativeStr = relativePath.toExplicitRelative().join();
                    relativeToAbsolute.set(relativeStr, absolute);
                    return relativeStr;
                });
                advice = [
                    ...advice,
                    ...diagnostics_1.buildSuggestionAdvice(query.source.join(), relativeSuggestions, {
                        formatItem: (relative) => {
                            const absolute = relativeToAbsolute.get(relative);
                            if (absolute === undefined) {
                                throw new Error('Should be valid');
                            }
                            return string_markup_1.markup `<filelink target="${absolute}">${relative}</filelink>`;
                        },
                    }),
                ];
            }
        }
        // Hint if this was an entry resolve and the cwd wasn't a project
        if (query.entry === true &&
            resolver.master.projectManager.findProjectExisting(localQuery.origin) ===
                undefined) {
            advice.push({
                type: 'log',
                category: 'warn',
                text: "You aren't in a Rome project",
            });
        }
    }
    // TODO check if this would have been successful if not for exports access control
    const source = querySource.source === undefined ? query.source.join() : querySource.source;
    if (resolved.advice !== undefined) {
        advice = advice.concat(resolved.advice);
    }
    throw diagnostics_1.createSingleDiagnosticError({
        location,
        description: {
            ...diagnostics_1.descriptions.RESOLVER.NOT_FOUND(resolved.type, source, location),
            advice,
        },
    });
}
exports.default = resolverSuggest;
function getPathSuggestions(resolver, query) {
    const { source } = query;
    const originFolder = resolver.getOriginFolder(query);
    const suggestions = new Map();
    // Try normal resolved
    tryPathSuggestions(resolver, suggestions, originFolder.resolve(source));
    // Remove . and .. entries from beginning
    const sourceParts = [...source.getSegments()];
    while (sourceParts[0] === '.' || sourceParts[0] === '..') {
        sourceParts.shift();
    }
    // Try parent directories of the origin
    for (const path of originFolder.getChain()) {
        tryPathSuggestions(resolver, suggestions, path.append(sourceParts));
    }
    return suggestions;
}
const MIN_SIMILARITY = 0.8;
function tryPathSuggestions(resolver, suggestions, path) {
    const { memoryFs } = resolver.master;
    const segments = path.getSegments();
    const chain = path.getChain();
    // Get all segments that are unknown
    for (let i = chain.length - 1; i >= 0; i--) {
        const path = chain[i];
        if (memoryFs.exists(path)) {
            // If this is an absolute match then we should be a suggestion
            if (i === chain.length) {
                const filename = path.join();
                suggestions.set(filename, filename);
            }
            // Otherwise this segment exists and should have been dealt with previously in the loop
            break;
        }
        const parentPath = path.getParent();
        // Our basename isn't valid, but our parent exists
        if (!memoryFs.exists(path) && memoryFs.exists(parentPath)) {
            const entries = Array.from(memoryFs.readdir(parentPath), (path) => path.join());
            if (entries.length === 0) {
                continue;
            }
            const ratings = string_utils_1.orderBySimilarity(path.getExtensionlessBasename(), entries, {
                minRating: MIN_SIMILARITY,
                formatItem: (target) => {
                    return path_1.createUnknownFilePath(target).getExtensionlessBasename();
                },
            });
            for (const rating of ratings) {
                tryPathSuggestions(resolver, suggestions, path_1.createUnknownFilePath(rating.target).append(segments.slice(1)).assertAbsolute());
            }
        }
    }
}
function getPackageSuggestions(resolver, query) {
    const possibleGlobalPackages = new Map();
    const mainProject = resolver.master.projectManager.findProjectExisting(query.origin);
    if (mainProject !== undefined) {
        const projects = resolver.master.projectManager.getHierarchyFromProject(mainProject);
        for (const project of projects) {
            for (const [name, value] of project.packages) {
                possibleGlobalPackages.set(name, value.folder.join());
            }
        }
    }
    // TODO Add node_modules
    const matches = string_utils_1.orderBySimilarity(query.source.join(), Array.from(possibleGlobalPackages.keys()), { minRating: MIN_SIMILARITY }).map((item) => {
        const name = item.target;
        const absolute = possibleGlobalPackages.get(name);
        if (absolute === undefined) {
            throw new Error('Should exist');
        }
        return [name, absolute];
    });
    return new Map(matches);
}
function getSuggestions(resolver, query) {
    if (query.entry === true) {
        return new Map([
            ...getPathSuggestions(resolver, query),
            ...getPackageSuggestions(resolver, query),
        ]);
    }
    else if (Resolver_1.isPathLike(query.source)) {
        return getPathSuggestions(resolver, query);
    }
    else {
        return getPackageSuggestions(resolver, query);
    }
}
