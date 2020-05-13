"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const Graph_1 = require("./Graph");
const Evaluator_1 = require("./Evaluator");
const Utils_1 = require("./Utils");
const statuses = {
    OPEN: 0,
    CLOSING: 1,
    CLOSED: 2,
};
class Hub {
    constructor(ast, project) {
        this.context = new js_compiler_1.CompilerContext({
            // TODO
            sourceText: '',
            ast,
            project,
            origin: {
                category: 'typeChecking',
            },
        });
        this.utils = new Utils_1.default(this);
        this.graph = new Graph_1.default();
        this.evaluator = new Evaluator_1.default(this, ast.filename);
        this.status = statuses.OPEN;
    }
    close() {
        this.status = statuses.CLOSING;
        for (const [node] of this.graph.nodesByValue) {
            this.utils.reduce(node);
        }
        this.status = statuses.CLOSED;
    }
    isClosing() {
        return this.status === statuses.CLOSING;
    }
    isOpen() {
        return this.isClosing() || this.status === statuses.OPEN;
    }
    isClosed() {
        return this.isClosing() || this.status === statuses.CLOSED;
    }
    assertOpen() {
        if (this.isClosed() && this.isClosing() === false) {
            throw new Error('This method can only be called when the graph has been open');
        }
    }
    assertClosed() {
        if (this.isOpen() && this.isClosing() === false) {
            throw new Error('This method can only be called when the graph has been closed');
        }
    }
}
exports.default = Hub;
