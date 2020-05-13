"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const project_1 = require("@romejs/project");
const js_compiler_1 = require("@romejs/js-compiler");
function removeProp(obj) {
    const { loc, ...locless } = obj;
    loc;
    return locless;
}
const removeLocTransform = [
    {
        name: 'removeLocTransform',
        enter(path) {
            const { node } = path;
            if (node.loc === undefined) {
                return node;
            }
            else {
                const newNode = removeProp(node);
                // Also remove any `undefined` properties
                // rome-ignore lint/noExplicitAny
                const escaped = newNode;
                for (const key in newNode) {
                    if (escaped[key] === undefined) {
                        // rome-ignore lint/noDelete
                        delete escaped[key];
                    }
                }
                return newNode;
            }
        },
    },
];
function removeLoc(ast) {
    const context = new js_compiler_1.CompilerContext({
        sourceText: '',
        ast: js_ast_1.MOCK_PROGRAM,
        project: {
            folder: undefined,
            config: project_1.DEFAULT_PROJECT_CONFIG,
        },
    });
    return context.reduce(ast, removeLocTransform);
}
exports.default = removeLoc;
