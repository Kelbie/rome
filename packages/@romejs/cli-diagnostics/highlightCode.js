"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_parser_1 = require("@romejs/js-parser");
const ob1_1 = require("@romejs/ob1");
const codec_json_1 = require("@romejs/codec-json");
const path_1 = require("@romejs/path");
const string_markup_1 = require("@romejs/string-markup");
// 100KB
const FILE_SIZE_MAX = 100000;
function highlightCode(opts) {
    if (opts.input.length > FILE_SIZE_MAX) {
        return string_markup_1.escapeMarkup(opts.input);
    }
    if (opts.language === 'js') {
        // js-parser does not accept an "unknown" sourceType
        return highlightJS(opts.input, opts.sourceType === undefined || opts.sourceType === 'unknown'
            ? 'script'
            : opts.sourceType);
    }
    if (opts.language === 'json') {
        return highlightJSON(opts.path, opts.input);
    }
    return string_markup_1.escapeMarkup(opts.input);
}
exports.default = highlightCode;
function reduce(input, tokens, callback) {
    let prevEnd = 0;
    let buff = '';
    for (const token of tokens) {
        const start = ob1_1.ob1Get0(token.start);
        const end = ob1_1.ob1Get0(token.end);
        let value = input.slice(start, end);
        // Add on text between tokens
        buff += string_markup_1.escapeMarkup(input.slice(prevEnd, start));
        prevEnd = end;
        // We need to break up the token text into lines, so that we can easily split the highlighted newlines and have the ansi codes be unbroken
        const lines = value.split('\n');
        const values = lines.map((line) => {
            return callback(token, string_markup_1.escapeMarkup(line));
        });
        buff += values.join('\n');
    }
    return buff;
}
function invalidHighlight(line) {
    return string_markup_1.markupTag('emphasis', string_markup_1.markupTag('color', line, { bg: 'red' }));
}
function highlightJSON(path, input) {
    const tokens = codec_json_1.tokenizeJSON({
        input,
        // Wont be used anywhere but activates JSON extensions if necessary
        path,
    });
    return reduce(input, tokens, (token, value) => {
        // Try to keep the highlighting in line with JS where possible
        switch (token.type) {
            case 'BlockComment':
            case 'LineComment':
                return string_markup_1.markupTag('color', value, { fg: 'brightBlack' });
            case 'String':
                return string_markup_1.markupTag('color', value, { fg: 'green' });
            case 'Number':
                return string_markup_1.markupTag('color', value, { fg: 'magenta' });
            case 'Word':
                switch (token.value) {
                    case 'true':
                    case 'false':
                    case 'null':
                        return string_markup_1.markupTag('color', value, { fg: 'cyan' });
                    default:
                        return value;
                }
            case 'Comma':
            case 'Colon':
            case 'Dot':
                return string_markup_1.markupTag('color', value, { fg: 'yellow' });
            case 'BracketOpen':
            case 'BracketClose':
            case 'BraceOpen':
            case 'BraceClose':
            case 'Minus':
            case 'Plus':
                return value;
            case 'Invalid':
                return invalidHighlight(value);
            // Will never be hit
            case 'EOF':
            case 'SOF':
                return '';
        }
    });
}
function highlightJS(input, sourceType) {
    const tokens = js_parser_1.tokenizeJS(input, {
        sourceType,
        // js-parser requires a filename. Doesn't really matter since we'll never be producing an AST or diagnostics
        path: path_1.createUnknownFilePath('unknown'),
    });
    return reduce(input, tokens, (token, value) => {
        const { type } = token;
        switch (type.label) {
            case 'break':
            case 'case':
            case 'catch':
            case 'continue':
            case 'debugger':
            case 'default':
            case 'do':
            case 'else':
            case 'finally':
            case 'for':
            case 'function':
            case 'if':
            case 'return':
            case 'switch':
            case 'throw':
            case 'try':
            case 'var':
            case 'const':
            case 'while':
            case 'with':
            case 'new':
            case 'this':
            case 'super':
            case 'class':
            case 'extends':
            case 'export':
            case 'import':
            case 'null':
            case 'true':
            case 'false':
            case 'in':
            case 'instanceof':
            case 'typeof':
            case 'void':
            case 'delete':
                return string_markup_1.markupTag('color', value, { fg: 'cyan' });
            case 'num':
            case 'bigint':
                return string_markup_1.markupTag('color', value, { fg: 'magenta' });
            case 'regexp':
                return string_markup_1.markupTag('color', value, { fg: 'magenta' });
            case 'string':
            case 'template':
            case '`':
                return string_markup_1.markupTag('color', value, { fg: 'green' });
            case 'invalid':
                return invalidHighlight(value);
            case 'comment':
                return string_markup_1.markupTag('color', value, { fg: 'brightBlack' });
            case ',':
            case ';':
            case ':':
            case '::':
            case '${':
            case '.':
            case '?':
            case '?.':
                return string_markup_1.markupTag('color', value, { fg: 'yellow' });
            case '[':
            case ']':
            case '{':
            case '{|':
            case '}':
            case '|}':
            case '(':
            case ')':
                return value;
            case '=>':
            case '...':
            case '@':
            case '#':
            case '=':
            case '_=':
            case '++/--':
            case '!':
            case '~':
            case '??':
            case '||':
            case '&&':
            case '|':
            case '^':
            case '&':
            case '==/!=':
            case '</>':
            case '<</>>':
            case '+/-':
            case '%':
            case '*':
            case '/':
            case '**':
            case 'jsxName':
            case 'jsxText':
            case 'jsxTagStart':
            case 'jsxTagEnd':
            case 'name':
            case 'eof':
                return value;
        }
    });
}
