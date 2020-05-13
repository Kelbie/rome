"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const base64_1 = require("./base64");
const ob1_1 = require("@romejs/ob1");
function getParsedMappingKey(line, column) {
    return `${String(line)}:${String(column)}`;
}
exports.getParsedMappingKey = getParsedMappingKey;
class SourceMapConsumer {
    constructor(file, getMappings) {
        this.file = file;
        this._getMappings = getMappings;
        this.mappings = undefined;
    }
    static charIsMappingSeparator(str, index) {
        const c = str.charAt(index);
        return c === ';' || c === ',';
    }
    static fromJSON(sourceMap) {
        return new SourceMapConsumer(sourceMap.file, () => SourceMapConsumer.parseMappings(sourceMap));
    }
    static parseMappings(sourceMap) {
        const rawStr = sourceMap.mappings;
        const map = new Map();
        let generatedLine = ob1_1.ob1Number1;
        let previousGeneratedColumn = ob1_1.ob1Number0;
        let previousOriginalLine = ob1_1.ob1Number1;
        let previousOriginalColumn = ob1_1.ob1Number0;
        let previousSource = 0;
        let previousName = 0;
        let length = rawStr.length;
        let index = 0;
        let cachedSegments = {};
        let value;
        while (index < length) {
            const char = rawStr[index];
            if (char === ';') {
                generatedLine = ob1_1.ob1Inc(generatedLine);
                index++;
                previousGeneratedColumn = ob1_1.ob1Number0;
            }
            else if (char === ',') {
                index++;
            }
            else {
                const mapping = {
                    generated: {
                        line: generatedLine,
                        column: ob1_1.ob1Number0,
                    },
                    original: {
                        line: ob1_1.ob1Number1,
                        column: ob1_1.ob1Number0,
                    },
                    source: undefined,
                    name: undefined,
                };
                // Because each offset is encoded relative to the previous one,
                // many segments often have the same encoding. We can exploit this
                // fact by caching the parsed variable length fields of each segment,
                // allowing us to avoid a second parse if we encounter the same
                // segment again.
                let end = index;
                for (; end < length; end++) {
                    if (SourceMapConsumer.charIsMappingSeparator(rawStr, end)) {
                        break;
                    }
                }
                const str = rawStr.slice(index, end);
                let segment = cachedSegments[str];
                if (segment) {
                    index += str.length;
                }
                else {
                    segment = [];
                    while (index < end) {
                        [value, index] = base64_1.decodeVLQ(rawStr, index);
                        segment.push(value);
                    }
                    if (segment.length === 2) {
                        throw new Error('Found a source, but no line and column');
                    }
                    if (segment.length === 3) {
                        throw new Error('Found a source and line, but no column');
                    }
                    cachedSegments[str] = segment;
                }
                // Generated column
                mapping.generated.column = ob1_1.ob1Add(previousGeneratedColumn, segment[0]);
                previousGeneratedColumn = mapping.generated.column;
                if (segment.length > 1) {
                    // Original source
                    mapping.source = sourceMap.sources[previousSource + segment[1]];
                    previousSource += segment[1];
                    // Original line
                    const newOriginalLine = ob1_1.ob1Add(previousOriginalLine, segment[2]);
                    previousOriginalLine = newOriginalLine;
                    // Lines are stored 0-based
                    mapping.original.line = ob1_1.ob1Add(newOriginalLine, 1);
                    // Original column
                    const newOriginalColumn = ob1_1.ob1Add(previousOriginalColumn, segment[3]);
                    mapping.original.column = newOriginalColumn;
                    previousOriginalColumn = newOriginalColumn;
                    if (segment.length > 4) {
                        // Original name
                        mapping.name = sourceMap.names[previousName + segment[4]];
                        previousName += segment[4];
                    }
                }
                map.set(getParsedMappingKey(mapping.generated.line, mapping.generated.column), mapping);
            }
        }
        return map;
    }
    clearCache() {
        this.mappings = undefined;
    }
    getMappings() {
        if (this.mappings === undefined) {
            const mappings = this._getMappings();
            this.mappings = mappings;
            return mappings;
        }
        else {
            return this.mappings;
        }
    }
    approxOriginalPositionFor(line, column) {
        while (ob1_1.ob1Get0(column) >= 0) {
            const mapping = this.exactOriginalPositionFor(line, column);
            if (mapping === undefined) {
                column = ob1_1.ob1Dec(column);
                continue;
            }
            else {
                return mapping;
            }
        }
        return undefined;
    }
    exactOriginalPositionFor(line, column) {
        const key = getParsedMappingKey(line, column);
        const mapping = this.getMappings().get(key);
        if (mapping === undefined) {
            return undefined;
        }
        const source = mapping.source === undefined ? this.file : mapping.source;
        if (source === undefined) {
            throw new Error('Mapping provided unknown source');
        }
        return {
            source,
            line: mapping.original.line,
            column: mapping.original.column,
            name: mapping.name,
        };
    }
}
exports.default = SourceMapConsumer;
