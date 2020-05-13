"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const context_1 = require("./context");
const types_1 = require("./types");
const ob1_1 = require("@romejs/ob1");
const EMPTY_POS = {
    line: ob1_1.ob1Number1,
    column: ob1_1.ob1Number0,
    index: ob1_1.ob1Number0,
};
function createInitialState() {
    return {
        scopes: {},
        diagnostics: [],
        diagnosticFilters: [],
        hasHoistedVars: false,
        corrupt: false,
        tokens: [],
        potentialArrowAt: ob1_1.ob1Number0Neg1,
        commaAfterSpreadAt: ob1_1.ob1Number0Neg1,
        yieldPos: ob1_1.ob1Number0,
        awaitPos: ob1_1.ob1Number0,
        noArrowAt: [],
        noArrowParamsConversionAt: [],
        maybeInArrowParameters: false,
        isIterator: false,
        noAnonFunctionType: false,
        classLevel: ob1_1.ob1Number0,
        labels: [],
        yieldInPossibleArrowParameters: undefined,
        comments: [],
        trailingComments: [],
        leadingComments: [],
        commentStack: [],
        commentPreviousNode: undefined,
        index: ob1_1.ob1Number0,
        lineStartIndex: ob1_1.ob1Number0,
        curLine: ob1_1.ob1Number1,
        tokenType: types_1.types.eof,
        tokenValue: undefined,
        startPos: EMPTY_POS,
        endPos: EMPTY_POS,
        lastStartPos: EMPTY_POS,
        lastEndPos: EMPTY_POS,
        context: [context_1.types.braceStatement],
        exprAllowed: true,
        containsOctal: false,
        escapePosition: undefined,
        octalPosition: undefined,
        invalidTemplateEscapePosition: undefined,
        exportedIdentifiers: new Map(),
        lineStart: true,
        indentLevel: ob1_1.ob1Number0,
    };
}
exports.createInitialState = createInitialState;
