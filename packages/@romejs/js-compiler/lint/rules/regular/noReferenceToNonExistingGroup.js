"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
function findCaptureGroups(path) {
    const regexLiteral = path.findAncestry((path) => path.node.type === 'RegExpLiteral');
    if (regexLiteral === undefined) {
        return regexLiteral;
    }
    let captureGroups = [];
    regexLiteral.traverse('RegExpLiteral', (path) => {
        if (path.node.type === 'RegExpGroupCapture') {
            captureGroups.push(path.node);
        }
    });
    return captureGroups;
}
exports.default = {
    name: 'noReferenceToNonExistingGroup',
    enter(path) {
        const { node, context } = path;
        if (node.type === 'RegExpNumericBackReference') {
            const allCaptureGroups = findCaptureGroups(path);
            if (allCaptureGroups === undefined) {
                context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_REFERENCE_TO_NON_EXISTING_GROUP(String(node.value)));
            }
            else {
                if (node.value > allCaptureGroups.length) {
                    context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_REFERENCE_TO_NON_EXISTING_GROUP(String(node.value)));
                }
            }
        }
        return node;
    },
};
