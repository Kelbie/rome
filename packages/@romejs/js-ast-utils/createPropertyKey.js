"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const isValidIdentifierName_1 = require("./isValidIdentifierName");
const js_ast_1 = require("@romejs/js-ast");
function createPropertyKey(name) {
    if (isValidIdentifierName_1.default(name)) {
        return js_ast_1.identifier.quick(name);
    }
    else {
        return js_ast_1.stringLiteral.quick(name);
    }
}
exports.default = createPropertyKey;
