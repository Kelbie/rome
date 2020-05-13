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
exports.default = {
    name: 'noDuplicateGroupNamesInRegularExpressions',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'RegExpSubExpression') {
            const duplicates = new DiagnosticsDuplicateHelper_1.DiagnosticsDuplicateHelper(context, diagnostics_1.descriptions.LINT.DUPLICATE_REGEX_GROUP_NAME);
            for (const bodyItem of node.body) {
                if (bodyItem.type === 'RegExpGroupCapture') {
                    const groupName = bodyItem.name;
                    if (groupName !== undefined) {
                        duplicates.addLocation(groupName, bodyItem.loc);
                    }
                }
            }
            duplicates.process();
        }
        return node;
    },
};
