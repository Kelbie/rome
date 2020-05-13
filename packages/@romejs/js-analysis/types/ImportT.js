"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const T_1 = require("./T");
class ImportT extends T_1.default {
    constructor(scope, originNode, opts) {
        super(scope, originNode);
        this.importedName = opts.importedName;
        this.relative =
            opts.relative === undefined ? scope.evaluator.filename : opts.relative;
        this.source = opts.source;
        this.absolute = undefined;
        this.resolvedType = undefined;
        scope.evaluator.addImport(this, {
            importedName: this.importedName,
            relative: this.relative,
            source: this.source,
        });
    }
    setAbsolute(absolute) {
        this.absolute = absolute;
    }
    setResolvedType(resolvedType) {
        this.resolvedType = resolvedType;
    }
    serialize() {
        return {
            importedName: this.importedName,
            relative: this.relative,
            source: this.source,
        };
    }
    static hydrate(scope, originNode, data) {
        return new ImportT(scope, originNode, {
            importedName: String(data.importedName),
            source: String(data.source),
            relative: String(data.relative),
        });
    }
    humanize(builder) {
        let object;
        if (this.resolvedType !== undefined) {
            object = builder.humanize(this.resolvedType);
        }
        else if (this.absolute === undefined) {
            object = `$Exports<"${this.source}", "${this.relative}">`;
        }
        else {
            object = `$Exports<"${this.absolute}">`;
        }
        if (this.importedName === undefined) {
            return object;
        }
        else {
            return `${object}.${this.importedName}`;
        }
    }
    reduce() {
        if (this.resolvedType === undefined) {
            return this;
        }
        else {
            return this.resolvedType;
        }
    }
}
exports.default = ImportT;
ImportT.type = 'ImportT';
