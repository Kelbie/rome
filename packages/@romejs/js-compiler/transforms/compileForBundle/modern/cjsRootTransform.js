"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _utils_1 = require("../_utils");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
exports.default = {
    name: 'cjsRootTransform',
    enter(path) {
        const { node, scope, context } = path;
        const { moduleId } = _utils_1.getOptions(context);
        if (node.type === 'Program') {
            const mappings = new Map();
            // make all variables private
            for (const [name] of path.scope.bindings) {
                mappings.set(name, _utils_1.getPrivateName(name, moduleId));
            }
            if (scope.hasBinding('exports') === false) {
                mappings.set('exports', _utils_1.getPrefixedNamespace(moduleId));
            }
            const newProgram = js_ast_utils_1.renameBindings(path, mappings);
            return newProgram;
        }
        return node;
    },
};
