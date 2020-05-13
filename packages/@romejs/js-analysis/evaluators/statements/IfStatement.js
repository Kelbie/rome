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
const BooleanT_1 = require("../../types/BooleanT");
const ExhaustiveT_1 = require("../../types/ExhaustiveT");
const UnionT_1 = require("../../types/UnionT");
function IfStatement(node, scope) {
    node = node.type === 'ConditionalExpression' ? node : js_ast_1.ifStatement.assert(node);
    const test = scope.evaluate(node.test);
    new ExhaustiveT_1.default(scope, node, test, new BooleanT_1.default(scope, undefined));
    const hasRefinedTest = test.scope instanceof scopes_1.RefineScope;
    const consequentScope = hasRefinedTest ? test.scope : scope;
    const consequent = consequentScope.evaluate(node.consequent);
    if (node.alternate === undefined) {
        return consequent;
    }
    else {
        const alternateScope = scope.fork();
        /*if (hasRefinedTest) {
          // get bindings from 'test.scope and flip them
          for (const name of test.scope.getOwnBindingNames()) {
            const outerBinding = scope.getBinding(name);
            invariant(outerBinding !== undefined, 'expected outerBinding for %s', name);
    
            const refinedBinding = test.scope.getBinding(name);
            invariant(refinedBinding !== undefined, 'expected refinedBinding for %s', name);
    
            const opposite = new RefinedT(alternateScope, refinedBinding.originNode, outerBinding, refinedBinding);
            alternateScope.addBinding(name, opposite);
          }
        }*/
        return new UnionT_1.default(scope, undefined, [consequent, alternateScope.evaluate(node.alternate)]);
    }
}
exports.default = IfStatement;
