"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mod = require("module");
const path_1 = require("@romejs/path");
const requires = new path_1.AbsoluteFilePathMap();
function getRequire(folder = path_1.CWD_PATH) {
    const cached = requires.get(folder);
    if (cached !== undefined) {
        return cached;
    }
    const filename = folder.join();
    const req = mod.createRequire
        ? mod.createRequire(filename)
        : mod.createRequireFromPath(filename);
    requires.set(folder, req);
    return req;
}
// rome-ignore lint/noExplicitAny
function requireGlobal(name, folder) {
    return getRequire(folder)(name);
}
exports.requireGlobal = requireGlobal;
