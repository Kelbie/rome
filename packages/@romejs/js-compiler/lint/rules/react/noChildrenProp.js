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
function isAttributePassingChildrenProp(attribute) {
    return attribute.type === 'JSXAttribute' && attribute.name.name === 'children';
}
function isCreateElementPassingChildrenProp(property) {
    return (property.type === 'ObjectProperty' &&
        property.key.value.type === 'Identifier' &&
        property.key.value.name === 'children');
}
exports.default = {
    name: 'noChildrenProp',
    enter(path) {
        const { node } = path;
        if ((node.type === 'JSXElement' &&
            node.attributes.find(isAttributePassingChildrenProp)) ||
            (node.type === 'CallExpression' &&
                js_ast_utils_1.doesNodeMatchPattern(node.callee, 'React.createElement') &&
                node.arguments[1].type === 'ObjectExpression' &&
                node.arguments[1].properties.find(isCreateElementPassingChildrenProp))) {
            path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_CHILDREN_PROP);
        }
        return node;
    },
};
