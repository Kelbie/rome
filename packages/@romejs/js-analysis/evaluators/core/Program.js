"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const BlockStatement_1 = require("../statements/BlockStatement");
function Program(node, scope) {
    node = js_ast_1.program.assert(node);
    BlockStatement_1.default(node, scope);
}
exports.default = Program;
