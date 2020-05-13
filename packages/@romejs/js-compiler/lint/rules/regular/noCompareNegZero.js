"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
const OPERATORS_TO_CHECK = ['>', '>=', '<', '<=', '==', '===', '!=', '!=='];
function isNegZero(node) {
    return (node.type === 'UnaryExpression' &&
        node.operator === '-' &&
        node.argument.type === 'NumericLiteral' &&
        node.argument.value === 0);
}
exports.default = {
    name: 'noCompareNegZero',
    enter(path) {
        const { node } = path;
        if (node.type === 'BinaryExpression' &&
            OPERATORS_TO_CHECK.includes(node.operator) &&
            (isNegZero(node.left) || isNegZero(node.right))) {
            if (node.operator === '===') {
                return path.context.addFixableDiagnostic({
                    old: node,
                    fixed: js_ast_utils_1.template.expression `Object.is(${node.left}, ${node.right})`,
                }, diagnostics_1.descriptions.LINT.NO_COMPARE_NEG_ZERO(node.operator));
            }
            else {
                path.context.addNodeDiagnostic(node, diagnostics_1.descriptions.LINT.NO_COMPARE_NEG_ZERO(node.operator));
            }
        }
        return node;
    },
};
