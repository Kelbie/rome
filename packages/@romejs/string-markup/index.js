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
__export(require("./parse"));
var format_1 = require("./format");
exports.markupToAnsi = format_1.markupToAnsi;
exports.markupToPlainText = format_1.markupToPlainText;
exports.markupToPlainTextString = format_1.markupToPlainTextString;
exports.normalizeMarkup = format_1.normalizeMarkup;
__export(require("./escape"));
__export(require("./ansi"));
