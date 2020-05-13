"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const path_1 = require("@romejs/path");
const defaultExportSameBasename_1 = require("./defaultExportSameBasename");
exports.default = {
    name: 'importDefaultBasename',
    enter(path) {
        const { node } = path;
        if (node.type === 'ImportDeclaration') {
            const { defaultSpecifier } = node;
            if (defaultSpecifier === undefined) {
                return node;
            }
            const expectedName = defaultExportSameBasename_1.filenameToId(path_1.createUnknownFilePath(node.source.value), false);
            if (expectedName === undefined) {
                return node;
            }
            const localName = defaultSpecifier.local.name.name;
            if (localName !== expectedName) {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.IMPORT_DEFAULT_BASENAME(localName, expectedName));
            }
        }
        return node;
    },
};
