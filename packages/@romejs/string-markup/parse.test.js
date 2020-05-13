"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const parse_1 = require("./parse");
rome_1.test('should not parse string escapes', async (t) => {
    t.snapshot(parse_1.parseMarkup('<filelink target="C:\\Users\\sebmck\\file.ts" />'));
    t.snapshot(parse_1.parseMarkup('<info>[MemoryFileSystem] Adding new project folder C:\\Users\\sebmck\\rome</info>'));
    t.snapshot(parse_1.parseMarkup('  \\<info>[MemoryFileSystem] Adding new project folder C:\\\\Users\\\\Sebastian\\\\rome\\\\\\</info>\n        <error><emphasis>^</emphasis></error> '));
});
