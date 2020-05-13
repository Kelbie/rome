"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const Builder_1 = require("./Builder");
exports.Builder = Builder_1.default;
const Printer_1 = require("./Printer");
function formatJS(ast, { format = 'pretty', typeAnnotations = true, sourceMaps = false, comments, indent = 0, } = {}) {
    const builder = new Builder_1.default({
        format,
        sourceMaps,
        typeAnnotations,
    }, ast.type === 'Program' ? ast.comments : comments);
    const token = builder.tokenize(ast, js_ast_1.MOCK_PARENT);
    const formatted = Printer_1.printTokenToString(token, {
        indentWidth: 2,
        printWidth: format === 'pretty' ? 80 : Infinity,
        rootIndent: indent,
    });
    return formatted;
}
exports.formatJS = formatJS;
