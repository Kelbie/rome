"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const data_1 = require("./data");
const idToLicense = new Map();
const licenseNames = [];
exports.licenseNames = licenseNames;
for (const license of data_1.default.licenses) {
    licenseNames.push(license.licenseId);
    idToLicense.set(license.licenseId, license);
}
function getSPDXLicense(licenseId) {
    return idToLicense.get(licenseId);
}
exports.getSPDXLicense = getSPDXLicense;
var parse_1 = require("./parse");
exports.parseSPDXLicense = parse_1.default;
var stringify_1 = require("./stringify");
exports.stringifySPDXLicense = stringify_1.default;
