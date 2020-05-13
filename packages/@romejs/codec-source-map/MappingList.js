"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const ob1_1 = require("@romejs/ob1");
/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    const lineA = mappingA.generated.line;
    const lineB = mappingB.generated.line;
    const columnA = mappingA.generated.column;
    const columnB = mappingB.generated.column;
    return (lineB > lineA ||
        (lineB === lineA && columnB >= columnA) ||
        util_1.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0);
}
/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a negligible overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
class MappingList {
    constructor() {
        this.array = [];
        this.sorted = true;
        this.last = {
            generated: { index: ob1_1.ob1Number0, line: ob1_1.ob1Number1Neg1, column: ob1_1.ob1Number0 },
            // TODO: original: undefined
            original: { line: ob1_1.ob1Number1Neg1, column: ob1_1.ob1Number0 },
            source: undefined,
            name: undefined,
        };
    }
    /**
     * Add the given source mapping.
     */
    add(mapping) {
        if (generatedPositionAfter(this.last, mapping)) {
            this.last = mapping;
            this.array.push(mapping);
        }
        else {
            this.sorted = false;
            this.array.push(mapping);
        }
    }
    /**
     * Returns the flat, sorted array of mappings. The mappings are sorted by
     * generated position.
     *
     * WARNING: This method returns internal data without copying, for
     * performance. The return value must NOT be mutated, and should be treated as
     * an immutable borrow. If you want to take ownership, you must make your own
     * copy.
     */
    toArray() {
        if (this.sorted === false) {
            this.array.sort(util_1.compareByGeneratedPositionsInflated);
            this.sorted = true;
        }
        return this.array;
    }
}
exports.default = MappingList;
