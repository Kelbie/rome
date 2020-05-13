"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const classProperties_1 = require("./compile/transpile/classProperties");
const paramlessCatch_1 = require("./compile/transpile/paramlessCatch");
const optionalChaining_1 = require("./compile/transpile/optionalChaining");
const nullishCoalescing_1 = require("./compile/transpile/nullishCoalescing");
const callSpread_1 = require("./compile/transpile/callSpread");
const templateLiterals_1 = require("./compile/transpile/templateLiterals");
const objectSpread_1 = require("./compile/transpile/objectSpread");
const optimizeImports_1 = require("./compile/validation/optimizeImports");
const optimizeExports_1 = require("./compile/validation/optimizeExports");
const jsx_1 = require("./compile/jsx");
const assetTransform_1 = require("./compileForBundle/assetTransform");
const cjsRootTransform_1 = require("./compileForBundle/modern/cjsRootTransform");
const esToRefTransform_1 = require("./compileForBundle/modern/esToRefTransform");
const requireRewriteTransform_1 = require("./compileForBundle/modern/requireRewriteTransform");
const magicCJSTransform_1 = require("./compileForBundle/legacy/magicCJSTransform");
const inlineRequiresTransform_1 = require("./compileForBundle/legacy/inlineRequiresTransform");
const esToCJSTransform_1 = require("./compileForBundle/legacy/esToCJSTransform");
const metaPropertyTransform_1 = require("./compileForBundle/metaPropertyTransform");
const scopedRomeTransform_1 = require("./compileForBundle/scopedRomeTransform");
const asyncImportTransform_1 = require("./compileForBundle/asyncImportTransform");
const inlineEnv_1 = require("./compileForBundle/inlineEnv");
const index_1 = require("./defaultHooks/index");
exports.stageOrder = [
    'pre',
    'compile',
    'compileForBundle',
];
exports.hookVisitors = [
    index_1.variableInjectorVisitor,
    index_1.commentInjectorVisitor,
];
exports.stageTransforms = {
    // These may effect dependency analysis
    pre: () => [optimizeImports_1.default, optimizeExports_1.default, jsx_1.default],
    compile: () => [
        paramlessCatch_1.default,
        optionalChaining_1.default,
        nullishCoalescing_1.default,
        objectSpread_1.default,
        classProperties_1.default,
        templateLiterals_1.default,
        callSpread_1.default,
    ],
    compileForBundle: (projectConfig, options) => {
        const opts = options.bundle;
        if (opts === undefined) {
            throw new Error('Expected bundle options for compileForBundle stage');
        }
        const transforms = [];
        if (opts.assetPath !== undefined) {
            transforms.push(assetTransform_1.default);
        }
        transforms.push(metaPropertyTransform_1.default);
        transforms.push(asyncImportTransform_1.default);
        transforms.push(scopedRomeTransform_1.default);
        transforms.push(inlineEnv_1.default);
        if (opts.mode === 'modern') {
            transforms.push(requireRewriteTransform_1.default);
            transforms.push(opts.analyze.moduleType === 'cjs' ? cjsRootTransform_1.default : esToRefTransform_1.default);
        }
        else {
            transforms.push(inlineRequiresTransform_1.default);
            transforms.push(esToCJSTransform_1.default);
            transforms.push(magicCJSTransform_1.default);
        }
        return transforms;
    },
};
