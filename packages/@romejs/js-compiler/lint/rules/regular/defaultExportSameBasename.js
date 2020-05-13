"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
const camelCase_1 = require("./camelCase");
function isValidDeclaration(node) {
    return node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration';
}
function filenameToId(path, capitalize) {
    let basename = path.getExtensionlessBasename();
    if (basename === 'index') {
        // If the filename is `index` then use the parent directory name
        basename = path.getParent().getExtensionlessBasename();
    }
    return camelCase_1.toVariableCamelCase(basename, capitalize);
}
exports.filenameToId = filenameToId;
exports.default = {
    name: 'defaultExportSameBasename',
    enter(path) {
        const { context, node } = path;
        if (node.type === 'Program') {
            let defaultExport;
            for (const bodyNode of node.body) {
                if (bodyNode.type === 'ExportDefaultDeclaration') {
                    defaultExport = bodyNode;
                    break;
                }
            }
            if (defaultExport !== undefined &&
                isValidDeclaration(defaultExport.declaration)) {
                const { declaration } = defaultExport;
                // Get the export default id
                const id = declaration.id;
                if (id !== undefined && context.path !== undefined) {
                    const type = declaration.type === 'FunctionDeclaration' ? 'function' : 'class';
                    const basename = filenameToId(context.path, type === 'class');
                    if (basename !== undefined && basename !== id.name) {
                        const correctFilename = id.name + context.path.getExtensions();
                        return context.addFixableDiagnostic({
                            target: id,
                            old: node,
                            fixed: js_ast_utils_1.renameBindings(path, new Map([[id.name, basename]])),
                        }, diagnostics_1.descriptions.LINT.DEFAULT_EXPORT_SAME_BASENAME({
                            defaultName: id.name,
                            defaultType: type,
                            actualFilename: basename,
                            correctFilename,
                        }));
                    }
                }
            }
        }
        return node;
    },
};
