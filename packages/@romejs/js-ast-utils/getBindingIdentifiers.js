"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
function getBindingIdentifiers(node) {
    const ids = [];
    let queue = Array.isArray(node)
        ? [...node]
        : [node];
    while (queue.length) {
        const node = queue.pop();
        if (node === undefined) {
            continue;
        }
        if (node.type === 'BindingIdentifier') {
            ids.push(node);
            continue;
        }
        const keys = js_ast_1.bindingKeys.get(node.type);
        if (keys === undefined) {
            continue;
        }
        for (const key of keys) {
            // rome-ignore lint/noExplicitAny
            const val = node[key];
            if (val === undefined) {
                continue;
            }
            else if (Array.isArray(val)) {
                queue = queue.concat(val);
            }
            else {
                queue.push(val);
            }
        }
    }
    return ids;
}
exports.default = getBindingIdentifiers;
