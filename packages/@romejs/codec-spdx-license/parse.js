"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const parser_core_1 = require("@romejs/parser-core");
const index_1 = require("./index");
const diagnostics_1 = require("@romejs/diagnostics");
const ob1_1 = require("@romejs/ob1");
function isWordChar(char) {
    return parser_core_1.isAlpha(char) || parser_core_1.isDigit(char) || char === '-' || char === '.';
}
const createSPDXLicenseParser = parser_core_1.createParser((ParserCore) => class SPDXLicenseParser extends ParserCore {
    constructor(opts) {
        super(opts, 'parse/spdxLicense');
        this.loose = opts.loose === true;
    }
    // For some reason Flow will throw an error without the type casts...
    tokenize(index, input) {
        const char = input[ob1_1.ob1Get0(index)];
        if (char === '+') {
            return this.finishToken('Plus');
        }
        if (char === '(') {
            return this.finishToken('ParenOpen');
        }
        if (char === ')') {
            return this.finishToken('ParenClose');
        }
        // Skip spaces
        if (char === ' ') {
            return this.lookaheadToken(ob1_1.ob1Inc(index));
        }
        if (isWordChar(char)) {
            const [value, end] = this.readInputFrom(index, isWordChar);
            if (value === 'AND') {
                return this.finishToken('And', end);
            }
            else if (value === 'OR') {
                return this.finishToken('Or', end);
            }
            else if (value === 'WITH') {
                return this.finishToken('With', end);
            }
            else {
                return this.finishValueToken('Word', value, end);
            }
        }
        return undefined;
    }
    parseLicense(token) {
        const startPos = this.getPosition();
        this.nextToken();
        // Validate id
        const id = token.value;
        let licenseInfo = index_1.getSPDXLicense(id);
        const nextToken = this.getToken();
        // Sometimes licenses will be specified as "Apache 2.0" but what they actually meant was "Apache-2.0"
        // In loose mode, just make it equivalent, otherwise, complain
        if (licenseInfo === undefined && nextToken.type === 'Word') {
            const possibleCorrectLicense = `${id}-${nextToken.value}`;
            const possibleLicenseInfo = index_1.getSPDXLicense(possibleCorrectLicense);
            if (possibleLicenseInfo !== undefined) {
                if (this.loose) {
                    // Just allow it...
                    licenseInfo = possibleLicenseInfo;
                    this.nextToken();
                }
                else {
                    throw this.unexpected({
                        description: diagnostics_1.descriptions.SPDX.VALID_LICENSE_WITH_MISSING_DASH(possibleCorrectLicense),
                        start: this.getPositionFromIndex(token.start),
                        end: this.getPositionFromIndex(nextToken.end),
                    });
                }
            }
        }
        if (licenseInfo === undefined) {
            throw this.unexpected({
                description: diagnostics_1.descriptions.SPDX.UNKNOWN_LICENSE(id, index_1.licenseNames),
                start: this.getPositionFromIndex(token.start),
                end: this.getPositionFromIndex(token.end),
            });
        }
        // Is this a plus? (wtf is this)
        const plus = this.eatToken('Plus') !== undefined;
        // Get exception
        let exception;
        if (this.eatToken('With')) {
            const token = this.getToken();
            if (token.type === 'Word') {
                exception = token.value;
                this.nextToken();
            }
            else {
                throw this.unexpected({
                    description: diagnostics_1.descriptions.SPDX.WITH_RIGHT_LICENSE_ONLY,
                });
            }
        }
        return {
            type: 'License',
            loc: this.finishLoc(startPos),
            id,
            exception,
            plus,
        };
    }
    parseExpression() {
        const startPos = this.getPosition();
        const startToken = this.getToken();
        let value;
        switch (startToken.type) {
            case 'ParenOpen': {
                this.nextToken();
                value = this.parseExpression();
                this.expectToken('ParenClose');
                break;
            }
            case 'Word': {
                value = this.parseLicense(startToken);
                break;
            }
            case 'Or':
            case 'And':
                throw this.unexpected({
                    description: diagnostics_1.descriptions.SPDX.OPERATOR_NOT_BETWEEN_EXPRESSION,
                });
            case 'Plus':
                throw this.unexpected({
                    description: diagnostics_1.descriptions.SPDX.PLUS_NOT_AFTER_LICENSE,
                });
            case 'ParenClose':
                throw this.unexpected({
                    description: diagnostics_1.descriptions.SPDX.UNOPENED_PAREN,
                });
            default:
                throw this.unexpected();
        }
        // Parse and/or
        const nextToken = this.getToken();
        switch (nextToken.type) {
            case 'Or': {
                this.nextToken();
                return {
                    type: 'Or',
                    loc: this.finishLoc(startPos),
                    left: value,
                    right: this.parseExpression(),
                };
            }
            case 'And': {
                this.nextToken();
                return {
                    type: 'And',
                    loc: this.finishLoc(startPos),
                    left: value,
                    right: this.parseExpression(),
                };
            }
            default:
                return value;
        }
    }
    parse() {
        const expr = this.parseExpression();
        this.finalize();
        return expr;
    }
});
function parse(opts) {
    return createSPDXLicenseParser(opts).parse();
}
exports.default = parse;
