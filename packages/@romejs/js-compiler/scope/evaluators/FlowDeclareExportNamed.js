"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    creator: false,
    build(node, parent, scope) {
        const { declaration } = node;
        const newScope = scope.evaluate(declaration, node);
        if (declaration !== undefined) {
            if (declaration.type === 'FlowDeclareOpaqueType') {
                newScope.getBindingAssert(declaration.id.name).setExported(true);
            }
        }
        return newScope;
    },
};
