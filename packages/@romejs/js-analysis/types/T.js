"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
let counter = 0;
class T {
    constructor(scope, originNode) {
        this.human = undefined;
        this.scope = scope;
        const { hub } = scope;
        this.hub = hub;
        this.utils = hub.utils;
        this.evaluator = hub.evaluator;
        this.originEvaluator = scope.evaluator.evaluatingType;
        // setup graph
        this.graph = scope.evaluator.graph;
        this.graph.addNode(this);
        this.originNode = originNode;
        this.originLoc = originNode === undefined ? undefined : originNode.loc;
        this.id = `${String(process.pid)}:${String(counter++)}`;
        this.compatibilityCache = new Map();
    }
    getConstructor() {
        // @ts-ignore
        return this.constructor;
    }
    setHuman(human) {
        this.human = human;
    }
    shouldMatch(type) {
        this.hub.assertOpen();
        this.graph.addLine(this, type);
    }
    hasConnections() {
        return this.graph.hasConnections(this);
    }
    explodeUnion() {
        return [this];
    }
    compatibleWith(otherType) {
        return otherType instanceof this.constructor;
    }
    clone() {
        const idsToType = new Map();
        const addType = (type) => {
            const reduced = this.utils.reduce(type);
            idsToType.set(type.id, type);
            return reduced.id;
        };
        const data = this.serialize(addType);
        const getType = (id) => {
            if (typeof id !== 'string') {
                throw new Error('Expected id to be a string');
            }
            const type = idsToType.get(id);
            if (type === undefined) {
                throw new Error('Expected type');
            }
            return type;
        };
        return this.getConstructor().hydrate(this.scope, this.originNode, data, getType);
    }
    static hydrate(scope, originNode, data, getType) {
        throw new Error(`Unimplemented ${this.type}.hydrate`);
    }
    serialize(addType) {
        throw new Error(`Unimplemented ${this.getConstructor().type}.prototype.serialize`);
    }
    reduce() {
        return this;
    }
    humanize(builder) {
        const reduced = this.utils.reduce(this);
        if (reduced === this) {
            throw new Error('unimplemented');
        }
        else {
            return builder.humanize(reduced);
        }
    }
    inspect() {
        return this.utils.inspect(this);
    }
}
exports.default = T;
T.type = 'T';
