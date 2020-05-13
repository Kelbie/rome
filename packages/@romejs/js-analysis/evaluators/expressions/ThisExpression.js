"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scopes_1 = require("../../scopes");
const js_ast_1 = require("@romejs/js-ast");
const OpenT_1 = require("../../types/OpenT");
function ThisExpression(node, scope) {
    node = js_ast_1.thisExpression.assert(node);
    const thisScope = scope.find(scopes_1.ThisScope);
    if (thisScope === undefined) {
        // TODO complain
        return undefined;
    }
    else {
        const type = new OpenT_1.default(scope, node);
        type.shouldMatch(thisScope.context);
        return type;
    }
}
exports.default = ThisExpression;
