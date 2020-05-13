"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
// lib
var CompilerContext_1 = require("./lib/CompilerContext");
exports.CompilerContext = CompilerContext_1.default;
var Path_1 = require("./lib/Path");
exports.Path = Path_1.default;
var Record_1 = require("./lib/Record");
exports.Record = Record_1.default;
var Cache_1 = require("./lib/Cache");
exports.Cache = Cache_1.default;
// methods
__export(require("./lint/decisions"));
var index_1 = require("./lint/index");
exports.lint = index_1.default;
var compile_1 = require("./api/compile");
exports.compile = compile_1.default;
var index_2 = require("./api/analyzeDependencies/index");
exports.analyzeDependencies = index_2.default;
exports.mergeAnalyzeDependencies = index_2.mergeAnalyzeDependencies;
// scope
var Scope_1 = require("./scope/Scope");
exports.Scope = Scope_1.default;
__export(require("./scope/bindings"));
// utils
__export(require("./constants"));
var utils_1 = require("./api/analyzeDependencies/utils");
exports.areAnalyzeDependencyResultsEqual = utils_1.areAnalyzeDependencyResultsEqual;
var _utils_1 = require("./transforms/compileForBundle/_utils");
exports.getPrefixedBundleNamespace = _utils_1.getPrefixedNamespace;
var createHook_1 = require("./api/createHook");
exports.createHook = createHook_1.default;
var suppressions_1 = require("./suppressions");
exports.extractSuppressionsFromProgram = suppressions_1.extractSuppressionsFromProgram;
exports.matchesSuppression = suppressions_1.matchesSuppression;
