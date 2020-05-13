"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Consumer_1 = require("./Consumer");
exports.Consumer = Consumer_1.default;
const EMPTY_CONSUME_OPTIONS = {
    propertyMetadata: undefined,
    value: undefined,
    handleUnexpectedDiagnostic: undefined,
    onDefinition: undefined,
    filePath: undefined,
    objectPath: [],
    parent: undefined,
};
function consume(opts) {
    return new Consumer_1.default({
        ...EMPTY_CONSUME_OPTIONS,
        ...opts,
    });
}
exports.consume = consume;
function consumeUnknown(value, category) {
    return new Consumer_1.default({
        ...EMPTY_CONSUME_OPTIONS,
        context: {
            category,
        },
        value,
    });
}
exports.consumeUnknown = consumeUnknown;
