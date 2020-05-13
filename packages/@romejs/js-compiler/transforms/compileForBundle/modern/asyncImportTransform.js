"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const js_ast_1 = require("@romejs/js-ast");
const _utils_1 = require("../_utils");
exports.default = {
    name: 'asyncImportTransform',
    enter(path) {
        const { node, context } = path;
        const opts = _utils_1.getOptions(context);
        // desugar import('source') to Rome.import(moduleId)
        if (node.type === 'ImportCall' && node.argument.type === 'StringLiteral') {
            const moduleId = _utils_1.getModuleId(node.argument.value, opts);
            if (moduleId !== undefined) {
                const id = js_ast_1.stringLiteral.create({
                    loc: node.argument.loc,
                    value: moduleId,
                });
                return js_ast_utils_1.template.expression `Rome.import(${id})`;
            }
        }
        return node;
    },
};
