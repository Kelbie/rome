"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
function isImportMeta(node) {
    return (node.type === 'MetaProperty' &&
        node.meta.name === 'import' &&
        node.property.name === 'meta');
}
function createURLString(context) {
    const str = js_ast_1.stringLiteral.create({
        value: `file://${getFilename(context)}`,
    });
    return js_ast_utils_1.template.expression `typeof __filename === 'string' ? 'file://' + __filename : ${str}`;
}
function getFilename(context) {
    const { path } = context;
    if (path === undefined) {
        return '';
    }
    else {
        return path.join();
    }
}
exports.default = {
    name: 'metaPropertyTransform',
    enter(path) {
        const { node, context } = path;
        // Inline __filenamd and __dirname
        /*if (
          node.type === 'ReferenceIdentifier' &&
          (node.type === '__dirname' || node.name === '__filename')
        ) {
          if (node.type === '__dirname') {
            return stringLiteral.create({
              value: pathUtils.dirname(getFilename(context)),
            });
          }
    
          if (node.type === '__filename') {
            return stringLiteral.create({
              value: getFilename(context),
            });
          }
        }*/
        // Direct reference to import.meta.url
        if (node.type === 'MemberExpression' &&
            node.property.type === 'StaticMemberProperty' &&
            isImportMeta(node.object) &&
            node.property.value.type === 'Identifier' &&
            node.property.value.name === 'url') {
            return createURLString(context);
        }
        // This is an escaped import.meta or else our other transform would have changed it
        if (isImportMeta(node)) {
            return js_ast_utils_1.template.expression `({url: ${createURLString(context)}})`;
        }
        return node;
    },
};
