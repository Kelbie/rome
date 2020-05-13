"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
class ImportRecord extends js_compiler_1.Record {
    constructor(data) {
        super();
        this.data = data;
    }
}
exports.ImportRecord = ImportRecord;
class ExportRecord extends js_compiler_1.Record {
    constructor(data) {
        super();
        this.data = data;
    }
}
exports.ExportRecord = ExportRecord;
// Whenever we encounter a reference to CJS module or exports
class EscapedCJSRefRecord extends js_compiler_1.Record {
    constructor(node) {
        super();
        this.node = node;
    }
}
exports.EscapedCJSRefRecord = EscapedCJSRefRecord;
// Whenever we encounter a exports or module.exports assignment
class CJSExportRecord extends js_compiler_1.Record {
    constructor(node) {
        super();
        this.node = node;
    }
}
exports.CJSExportRecord = CJSExportRecord;
class CJSVarRefRecord extends js_compiler_1.Record {
    constructor(node) {
        super();
        this.node = node;
    }
}
exports.CJSVarRefRecord = CJSVarRefRecord;
class ESExportRecord extends js_compiler_1.Record {
    constructor(kind, node) {
        super();
        this.node = node;
        this.kind = kind;
    }
}
exports.ESExportRecord = ESExportRecord;
// Whenever we encounter a top level await
class TopLevelAwaitRecord extends js_compiler_1.Record {
    constructor(loc) {
        super();
        this.loc = loc;
    }
}
exports.TopLevelAwaitRecord = TopLevelAwaitRecord;
// Whenever we encounter the first reference to an import
class ImportUsageRecord extends js_compiler_1.Record {
    constructor(isTop, data) {
        super();
        this.isTop = isTop;
        this.data = data;
    }
}
exports.ImportUsageRecord = ImportUsageRecord;
