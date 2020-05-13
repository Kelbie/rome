"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const ob1_1 = require("@romejs/ob1");
function createCoverageFileStats(covered, uncovered) {
    const total = uncovered + covered;
    return {
        uncovered,
        covered,
        total,
        percent: total === 0 ? 100 : 100 / total * covered,
    };
}
class CoverageCollector {
    constructor() {
        this.sourceMaps = new Map();
    }
    addSourceMap(filename, code, map) {
        this.sourceMaps.set(filename, {
            ranges: [],
            map,
            code,
        });
    }
    addCoverage(entries) {
        for (const entry of entries) {
            const filename = utils_1.urlToFilename(entry.url);
            const data = this.sourceMaps.get(filename);
            if (data === undefined) {
                continue;
            }
            for (const { ranges, functionName, isBlockCoverage } of entry.functions) {
                data.ranges = data.ranges.concat(ranges.map((range) => {
                    let kind = 'expression';
                    if (functionName !== '') {
                        kind = 'function';
                    }
                    else if (isBlockCoverage) {
                        kind = 'branch';
                    }
                    return {
                        kind,
                        ...range,
                    };
                }));
            }
        }
    }
    generate() {
        const insertedLocs = new Map();
        const locs = [];
        for (const data of this.sourceMaps.values()) {
            const { ranges, code, map } = data;
            // Turn an index into a position in the compiled source
            let line = ob1_1.ob1Number1;
            let column = ob1_1.ob1Number0;
            let index = ob1_1.ob1Number0;
            const indexCache = new Map();
            function findIndex(newIndex) {
                const cached = indexCache.get(newIndex);
                if (cached !== undefined) {
                    return cached;
                }
                if (newIndex < index) {
                    throw new Error(`Expected newIndex(${newIndex}) >= index(${index})`);
                }
                if (ob1_1.ob1Get0(newIndex) > code.length) {
                    throw new Error(`Expected newIndex(${newIndex}) <= code.length(${code.length})`);
                }
                while (index < newIndex) {
                    const char = code[ob1_1.ob1Get0(index)];
                    if (char === '\n') {
                        line = ob1_1.ob1Inc(line);
                        column = ob1_1.ob1Number0;
                    }
                    else {
                        column = ob1_1.ob1Inc(column);
                    }
                    index = ob1_1.ob1Inc(index);
                }
                const pos = {
                    index: newIndex,
                    line,
                    column,
                };
                indexCache.set(newIndex, pos);
                return pos;
            }
            // Prefetch all sorted indexes
            const offsets = [];
            for (const { startOffset, endOffset } of ranges) {
                offsets.push(ob1_1.ob1Coerce0(startOffset));
                offsets.push(ob1_1.ob1Coerce0(endOffset));
            }
            offsets.sort((a, b) => ob1_1.ob1Get0(a) - ob1_1.ob1Get0(b));
            for (const index of offsets) {
                findIndex(index);
            }
            //
            for (const { kind, startOffset, endOffset, count } of ranges) {
                const originalStart = findIndex(ob1_1.ob1Coerce0(startOffset));
                const originalEnd = findIndex(ob1_1.ob1Coerce0(endOffset));
                const sourceStart = map.approxOriginalPositionFor(originalStart.line, originalStart.column);
                if (sourceStart === undefined) {
                    continue;
                }
                const sourceEnd = map.approxOriginalPositionFor(originalEnd.line, originalEnd.column);
                if (sourceEnd === undefined) {
                    continue;
                }
                if (sourceStart.source !== sourceEnd.source) {
                    throw new Error(`Expected the same source for start and end: ${sourceStart.source} !== ${sourceEnd.source}`);
                }
                const key = `${sourceStart.source}:${String(startOffset)}-${String(endOffset)}`;
                const alreadyInserted = insertedLocs.get(key);
                if (alreadyInserted !== undefined) {
                    alreadyInserted.count += count;
                    continue;
                }
                const loc = {
                    kind,
                    filename: sourceStart.source,
                    count,
                    start: {
                        index: ob1_1.ob1Coerce0(startOffset),
                        line: sourceStart.line,
                        column: sourceStart.column,
                    },
                    end: {
                        index: ob1_1.ob1Coerce0(endOffset),
                        line: sourceEnd.line,
                        column: sourceEnd.column,
                    },
                };
                insertedLocs.set(key, loc);
                locs.push(loc);
            }
            map.clearCache();
        }
        // Assemble files
        const rangesByFile = new Map();
        for (const loc of locs) {
            let ranges = rangesByFile.get(loc.filename);
            if (ranges === undefined) {
                ranges = [];
                rangesByFile.set(loc.filename, ranges);
            }
            ranges.push(loc);
        }
        const files = [];
        for (const [filename, ranges] of rangesByFile) {
            const coveredLines = new Set();
            const uncoveredLines = new Set();
            let uncoveredFunctions = new Set();
            let coveredFunctions = new Set();
            let uncoveredBranches = new Set();
            let coveredBranches = new Set();
            for (const { count, kind, start, end } of ranges) {
                // Fill in lines
                for (let i = start.line; i <= end.line; i = ob1_1.ob1Inc(i)) {
                    if (count === 0) {
                        uncoveredLines.add(i);
                    }
                    else {
                        coveredLines.add(i);
                    }
                }
                // Mark covered kind
                if (kind === 'function') {
                    if (count === 0) {
                        uncoveredBranches.add(start.index);
                        uncoveredFunctions.add(start.line);
                    }
                    else {
                        coveredFunctions.add(start.line);
                        coveredBranches.add(start.index);
                    }
                }
                else if (kind === 'branch') {
                    if (count === 0) {
                        uncoveredBranches.add(start.index);
                    }
                    else {
                        coveredBranches.add(start.index);
                    }
                }
            }
            for (const line of coveredLines) {
                uncoveredLines.delete(line);
            }
            for (const index of coveredBranches) {
                uncoveredBranches.delete(index);
            }
            for (const index of coveredFunctions) {
                uncoveredFunctions.delete(index);
            }
            // No point showing fully covered files
            if (uncoveredLines.size === 0 &&
                uncoveredBranches.size === 0 &&
                uncoveredFunctions.size === 0) {
                continue;
            }
            files.push({
                filename,
                lines: createCoverageFileStats(coveredLines.size, uncoveredLines.size),
                branches: createCoverageFileStats(coveredBranches.size, uncoveredBranches.size),
                functions: createCoverageFileStats(coveredFunctions.size, uncoveredFunctions.size),
            });
        }
        return files;
    }
}
exports.default = CoverageCollector;
