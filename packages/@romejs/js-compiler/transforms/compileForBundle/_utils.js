"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
function getOptions(context) {
    const opts = context.options.bundle;
    if (opts === undefined) {
        throw new Error('No bundle options found');
    }
    return opts;
}
exports.getOptions = getOptions;
function getPrivateName(name, moduleId) {
    return `${js_compiler_1.SCOPE_PRIVATE_PREFIX}$priv$${normalizeModuleId(moduleId)}$${name}`;
}
exports.getPrivateName = getPrivateName;
// This is necessary so we can take our module uids which are paths on the file system into a valid JS identifier name
function normalizeModuleId(id) {
    // TODO probably need more stuff in this
    return id.replace(/[\\\/@\-]/g, '$').replace(/[\-.]/g, '_');
}
exports.normalizeModuleId = normalizeModuleId;
function getPrefixedName(name, moduleId, opts) {
    const forwarded = opts.resolvedImports[`${moduleId}:${name}`];
    if (forwarded !== undefined) {
        moduleId = forwarded.id;
        name = forwarded.name;
    }
    return `${getPrefixedNamespace(normalizeModuleId(moduleId))}$${name}`;
}
exports.getPrefixedName = getPrefixedName;
function getPrefixedNamespace(moduleId) {
    return `${js_compiler_1.SCOPE_PRIVATE_PREFIX}${normalizeModuleId(moduleId)}`;
}
exports.getPrefixedNamespace = getPrefixedNamespace;
function getModuleId(source, opts) {
    return opts.relativeSourcesToModuleId[source];
}
exports.getModuleId = getModuleId;
