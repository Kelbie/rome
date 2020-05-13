"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isTypeNode(node) {
    if (node.type.startsWith('Flow') ||
        node.type.startsWith('TS') ||
        node.type.endsWith('TypeAnnotation')) {
        return true;
    }
    else if (node.type === 'ImportDeclaration') {
        return node.importKind === 'type' || node.importKind === 'typeof';
    }
    else if (node.type === 'ExportDefaultDeclaration' ||
        node.type === 'ExportLocalDeclaration' ||
        node.type === 'ExportAllDeclaration') {
        return node.exportKind === 'type';
    }
    else if (node.type === 'ImportSpecifier') {
        return (node.local.importKind === 'type' || node.local.importKind === 'typeof');
    }
    else {
        return false;
    }
}
exports.default = isTypeNode;
