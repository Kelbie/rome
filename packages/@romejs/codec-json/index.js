"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
const consume_1 = require("@romejs/consume");
const stringify_1 = require("./stringify");
function consumeJSON(opts) {
    return consumeJSONExtra(opts).consumer;
}
exports.consumeJSON = consumeJSON;
function consumeJSONExtra(opts) {
    const parser = parse_1.createJSONParser(opts);
    const { value, context } = parser.parse();
    return {
        hasExtensions: parser.hasExtensions,
        consumer: consume_1.consume({
            filePath: parser.path,
            context,
            objectPath: [],
            value,
            parent: undefined,
        }),
        comments: parser.pathToComments,
    };
}
exports.consumeJSONExtra = consumeJSONExtra;
function parseJSON(opts) {
    return parse_1.createJSONParser(opts).parse().value;
}
exports.parseJSON = parseJSON;
function tokenizeJSON(opts) {
    return parse_1.createJSONParser(opts).tokenizeAll();
}
exports.tokenizeJSON = tokenizeJSON;
function stringifyJSON(opts) {
    return stringify_1.stringifyRootConsumer(opts.consumer, opts.comments);
}
exports.stringifyJSON = stringifyJSON;
