"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const _utils_1 = require("./_utils");
const fileHandlers_1 = require("@romejs/core/common/fileHandlers");
exports.default = {
    name: 'asset',
    enter(path) {
        const { node } = path;
        const options = _utils_1.getOptions(path.context);
        if (node.type === 'ExportDefaultDeclaration' &&
            node.declaration.type === 'StringLiteral' &&
            node.declaration.value === fileHandlers_1.ASSET_EXPORT_TEMPORARY_VALUE &&
            options.assetPath !== undefined) {
            return {
                ...node,
                declaration: {
                    ...node.declaration,
                    value: options.moduleId,
                },
            };
        }
        return node;
    },
};
