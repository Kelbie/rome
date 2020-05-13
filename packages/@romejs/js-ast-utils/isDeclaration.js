"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isDeclaration(node) {
    if (node === undefined) {
        return false;
    }
    switch (node.type) {
        case 'FunctionDeclaration':
        case 'ClassDeclaration':
        case 'ExportAllDeclaration':
        case 'ExportDefaultDeclaration':
        case 'ExportLocalDeclaration':
        case 'ImportDeclaration':
        case 'FlowDeclareClass':
        case 'FlowDeclareFunction':
        case 'FlowDeclareInterface':
        case 'FlowDeclareModule':
        case 'FlowDeclareModuleExports':
        case 'FlowDeclareOpaqueType':
        case 'FlowDeclareVariable':
        case 'FlowInterfaceDeclaration':
        case 'FlowOpaqueType':
        case 'TypeAliasTypeAnnotation':
        case 'VariableDeclarationStatement':
        case 'ExportExternalDeclaration':
        case 'FlowDeclareExportAll':
        case 'FlowDeclareExportDefault':
        case 'FlowDeclareExportNamed':
        case 'FlowInterface':
        case 'TSDeclareFunction':
        case 'TSEnumDeclaration':
        case 'TSExportAssignment':
        case 'TSImportEqualsDeclaration':
        case 'TSInterfaceDeclaration':
        case 'TSModuleDeclaration':
        case 'TSNamespaceExportDeclaration': {
            const declaration = node;
            declaration;
            return true;
        }
        default: {
            const notDeclaration = node;
            notDeclaration;
            return false;
        }
    }
}
exports.default = isDeclaration;
