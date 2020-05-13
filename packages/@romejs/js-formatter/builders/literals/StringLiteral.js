"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_escape_1 = require("@romejs/string-escape");
const js_parser_1 = require("@romejs/js-parser");
function StringLiteral(builder, node, parent) {
    // JSX Attribute strings have ridiculous alternate semantics, should probably be a distinct AST node
    const quotes = parent.type === 'JSXAttribute' || node.value.includes("'") ? '"' : "'";
    const value = parent.type === 'JSXAttribute'
        ? js_parser_1.escapeXHTMLEntities(node.value)
        : node.value;
    return string_escape_1.escapeString(value, { quote: quotes });
}
exports.default = StringLiteral;
