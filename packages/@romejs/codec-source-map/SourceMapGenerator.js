"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const base64 = require("./base64");
const util_1 = require("./util");
const ArraySet_1 = require("./ArraySet");
const MappingList_1 = require("./MappingList");
const ob1_1 = require("@romejs/ob1");
const SourceMapConsumer_1 = require("./SourceMapConsumer");
class SourceMapGenerator {
    constructor(args) {
        this.file = args.file;
        this.sourceRoot = args.sourceRoot;
        this.sourcesContents = new Map();
        this.map = undefined;
        this.sources = new ArraySet_1.default();
        this.names = new ArraySet_1.default();
        this.mappings = new MappingList_1.default();
        this.materializeCallbacks = [];
    }
    assertUnlocked() {
        if (this.map !== undefined) {
            throw new Error('Source map has already been materialized, serialize() should be your final call');
        }
    }
    addMaterializer(fn) {
        this.materializeCallbacks.push(fn);
    }
    /**
     * Add a single mapping from 'original source line and column to the generated
     * source's line and column for this source map being created. The mapping
     * object should have the following properties:
     *
     *   - generated: An object with the generated line and column positions.
     *   - original: An object with the original line and column positions.
     *   - source: The original source file (relative to the sourceRoot).
     *   - name: An optional original token name for this mapping.
     */
    addMapping(mapping) {
        this.assertUnlocked();
        const { name, source } = mapping;
        this.validatePosition('generated', mapping.generated.line, mapping.generated.column);
        if (mapping.original) {
            this.validatePosition('original', mapping.original.line, mapping.original.column);
        }
        if (source !== undefined) {
            this.sources.add(source);
        }
        if (name !== undefined) {
            this.names.add(name);
        }
        this.mappings.add(mapping);
    }
    /**
     * Set the source content for a source file.
     */
    setSourceContent(source, sourceContent) {
        this.assertUnlocked();
        if (this.sourceRoot !== undefined) {
            source = util_1.toRelativeUrl(this.sourceRoot, source);
        }
        if (sourceContent !== undefined) {
            // Add the source content to the _sourcesContents map.
            this.sourcesContents.set(source, sourceContent);
        }
        else {
            // Remove the source file from the _sourcesContents map.
            this.sourcesContents.delete(source);
        }
    }
    validatePosition(key, line, column) {
        if (ob1_1.ob1Get1(line) <= 0) {
            throw new Error(`${key} line should be >= 1 but is ${line}`);
        }
        if (ob1_1.ob1Get0(column) < 0) {
            throw new Error(`${key} column should be >= 0 but is ${column}`);
        }
    }
    /**
     * Serialize the accumulated mappings in to the stream of base 64 VLQs
     * specified by the source map format.
     */
    serializeMappings() {
        let previousGeneratedColumn = ob1_1.ob1Number0;
        let previousGeneratedLine = ob1_1.ob1Number1;
        let previousOriginalColumn = ob1_1.ob1Number0;
        let previousOriginalLine = ob1_1.ob1Number1;
        let previousName = 0;
        let previousSource = 0;
        let result = '';
        const mappings = this.mappings.toArray();
        for (let i = 0; i < mappings.length; i++) {
            const mapping = mappings[i];
            let next = '';
            if (mapping.generated.line !== previousGeneratedLine) {
                previousGeneratedColumn = ob1_1.ob1Number0;
                while (mapping.generated.line !== previousGeneratedLine) {
                    next += ';';
                    previousGeneratedLine = ob1_1.ob1Inc(previousGeneratedLine);
                }
            }
            else if (i > 0) {
                if (!util_1.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
                    continue;
                }
                next += ',';
            }
            next += base64.encodeVLQ(ob1_1.ob1Get0(mapping.generated.column) - ob1_1.ob1Get0(previousGeneratedColumn));
            previousGeneratedColumn = mapping.generated.column;
            if (mapping.source !== undefined) {
                const sourceIdx = this.sources.indexOf(mapping.source);
                next += base64.encodeVLQ(sourceIdx - previousSource);
                previousSource = sourceIdx;
                if (mapping.original) {
                    next += base64.encodeVLQ(ob1_1.ob1Get1(mapping.original.line) - ob1_1.ob1Get1(previousOriginalLine));
                    previousOriginalLine = mapping.original.line;
                    next += base64.encodeVLQ(ob1_1.ob1Get0(mapping.original.column) - ob1_1.ob1Get0(previousOriginalColumn));
                    previousOriginalColumn = mapping.original.column;
                    if (mapping.name !== undefined) {
                        const nameIdx = this.names.indexOf(mapping.name);
                        next += base64.encodeVLQ(nameIdx - previousName);
                        previousName = nameIdx;
                    }
                }
                // TODO: else, assert mapping.name is undefined since it can't be encoded without an original position
            }
            // TODO: else, assert mapping.original is undefined since it can't be encoded without a source
            result += next;
        }
        return result;
    }
    generateSourcesContent(sources, sourceRoot) {
        return sources.map((source) => {
            if (sourceRoot !== undefined) {
                source = util_1.toRelativeUrl(sourceRoot, source);
            }
            const content = this.sourcesContents.get(source);
            if (content === undefined) {
                throw new Error('Expected content');
            }
            return content;
        });
    }
    materialize() {
        for (const fn of this.materializeCallbacks) {
            fn();
        }
        this.materializeCallbacks = [];
    }
    /**
     * Externalize the source map.
     */
    serialize() {
        if (this.map !== undefined) {
            return this.map;
        }
        this.materialize();
        const sources = this.sources.toArray();
        this.map = {
            version: 3,
            file: this.file,
            names: this.names.toArray(),
            mappings: this.serializeMappings(),
            sourceRoot: this.sourceRoot,
            sources,
            sourcesContent: this.generateSourcesContent(sources, this.sourceRoot),
        };
        return this.map;
    }
    toComment() {
        const jsonMap = this.toJSON();
        const base64Map = new Buffer(jsonMap).toString('base64');
        const comment = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
        return comment;
    }
    toConsumer() {
        return new SourceMapConsumer_1.default(this.file, () => {
            const parsedMappings = new Map();
            for (const mapping of this.getMappings()) {
                parsedMappings.set(SourceMapConsumer_1.getParsedMappingKey(mapping.generated.line, mapping.generated.column), mapping);
            }
            return parsedMappings;
        });
    }
    getMappings() {
        this.materialize();
        return this.mappings.toArray();
    }
    toJSON() {
        return JSON.stringify(this.serialize());
    }
}
exports.default = SourceMapGenerator;
