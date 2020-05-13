"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const dependencies_1 = require("./dependencies");
const consume_1 = require("@romejs/consume");
rome_1.test('can parse npm dependency patterns', async (t) => {
    t.snapshot(dependencies_1.parseDependencyPattern(consume_1.consumeUnknown('npm:foo', 'parse/json'), false));
    t.snapshot(dependencies_1.parseDependencyPattern(consume_1.consumeUnknown('npm:@foo/bar', 'parse/json'), false));
    t.snapshot(dependencies_1.parseDependencyPattern(consume_1.consumeUnknown('npm:foo@1.0.0', 'parse/json'), false));
    t.snapshot(dependencies_1.parseDependencyPattern(consume_1.consumeUnknown('npm:@foo/bar@1.0.0', 'parse/json'), false));
});
