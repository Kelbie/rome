"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const DiagnosticsDuplicateHelper_1 = require("../../../lib/DiagnosticsDuplicateHelper");
function extractPropertyKey(node) {
    if (node.key.type === 'StaticPropertyKey') {
        const { value } = node.key;
        if (value.type === 'PrivateName') {
            return value.id.name;
        }
        if (value.type === 'Identifier') {
            return value.name;
        }
        return String(value.value);
    }
    return undefined;
}
exports.default = {
    name: 'noDuplicateKeys',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'ObjectExpression') {
            const duplicates = new DiagnosticsDuplicateHelper_1.DiagnosticsDuplicateHelper(context, diagnostics_1.descriptions.LINT.NO_DUPLICATE_KEYS);
            for (const prop of node.properties) {
                if (prop.type === 'SpreadProperty') {
                    continue;
                }
                const key = extractPropertyKey(prop);
                if (key !== undefined) {
                    duplicates.addLocation(key, prop.key.loc);
                }
            }
            duplicates.process();
        }
        return node;
    },
};
