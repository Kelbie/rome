"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Graph {
    constructor() {
        this.nodes = [];
        this.nodesByValue = new Map();
    }
    addNode(value) {
        if (this.find(value)) {
            return;
        }
        const node = { lines: [], value };
        this.nodesByValue.set(value, node);
        this.nodes.push(node);
    }
    find(value) {
        return this.nodesByValue.get(value);
    }
    hasConnections(value) {
        const node = this.nodesByValue.get(value);
        return node !== undefined && (node?.lines).length > 0;
    }
    addLine(startValue, endValue) {
        const startNode = this.find(startValue);
        const endNode = this.find(endValue);
        if (!startNode || !endNode) {
            throw new Error('Both nodes need to exist');
        }
        startNode.lines.push(endNode);
    }
}
exports.default = Graph;
