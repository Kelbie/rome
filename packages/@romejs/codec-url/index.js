"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const consume_1 = require("@romejs/consume");
const url = require("url");
const ob1_1 = require("@romejs/ob1");
function consumeUrl(rawUrl) {
    const parts = url.parse(rawUrl, true);
    const query = consume_1.consumeUnknown({ ...parts.query }, 'parse/url/query');
    const path = consume_1.consume({
        value: parts.pathname,
        context: {
            category: 'parse/url',
            getDiagnosticPointer() {
                return {
                    language: 'url',
                    mtime: undefined,
                    sourceText: rawUrl,
                    filename: 'url',
                    start: {
                        index: ob1_1.ob1Number0,
                        line: ob1_1.ob1Number1,
                        column: ob1_1.ob1Number0,
                    },
                    end: {
                        index: ob1_1.ob1Coerce0(rawUrl.length - 1),
                        line: ob1_1.ob1Number1,
                        column: ob1_1.ob1Coerce0(rawUrl.length - 1),
                    },
                };
            },
        },
    });
    return { query, path };
}
exports.consumeUrl = consumeUrl;
