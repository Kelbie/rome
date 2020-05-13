"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const UndeclaredVarE_1 = require("../../types/errors/UndeclaredVarE");
const OpenT_1 = require("../../types/OpenT");
const AnyT_1 = require("../../types/AnyT");
function Identifier(node, scope) {
    node = js_ast_1.identifier.assert(node);
    const binding = scope.getBinding(node.name);
    if (binding) {
        const type = new OpenT_1.default(scope, node);
        type.shouldMatch(binding);
        return type;
    }
    else {
        switch (node.name) {
            case 'React$PropType$Primitive':
            case 'React$PropType$ArrayOf':
            case 'React$PropType$InstanceOf':
            case 'React$PropType$ObjectOf':
            case 'React$PropType$OneOf':
            case 'React$PropType$OneOfType':
            case 'React$PropTypePartial':
            case 'React$ElementProps':
            case 'React$ElementRef':
            case '$Exact':
            case 'Partial':
            case '$Keys':
            case 'Object$Assign':
            case 'Object$GetPrototypeOf':
            case 'Object$SetPrototypeOf':
            case '$CharSet':
            case 'Class':
            case '$Compose':
            case '$ComposeReverse':
            case '$Subtype':
            case 'Function$Prototype$Apply':
            case 'Function$Prototype$Bind':
            case 'Function$Prototype$Call':
            case '$Exports':
                return new AnyT_1.default(scope, node);
            default:
                return new UndeclaredVarE_1.default(scope, node, node.name);
        }
    }
}
exports.default = Identifier;
