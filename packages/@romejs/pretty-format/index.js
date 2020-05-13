"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_helpers_1 = require("@romejs/typescript-helpers");
const string_escape_1 = require("@romejs/string-escape");
const string_utils_1 = require("@romejs/string-utils");
const string_markup_1 = require("@romejs/string-markup");
const DEFAULT_OPTIONS = {
    maxDepth: Infinity,
    markup: false,
    indent: '',
    depth: 0,
    stack: [],
    compact: false,
};
const INDENT = '  ';
function maybeEscapeMarkup(str, opts) {
    if (opts.markup) {
        return string_markup_1.escapeMarkup(str);
    }
    else {
        return str;
    }
}
exports.CUSTOM_PRETTY_FORMAT = Symbol();
function prettyFormat(obj, rawOpts = {}) {
    const opts = {
        ...DEFAULT_OPTIONS,
        ...rawOpts,
    };
    if (opts.maxDepth === opts.depth) {
        return '[depth exceeded]';
    }
    switch (typeof obj) {
        case 'symbol': {
            const val = maybeEscapeMarkup(formatSymbol(obj), opts);
            return opts.markup ? string_markup_1.markupTag('color', val, { fg: 'green' }) : val;
        }
        case 'string': {
            const val = maybeEscapeMarkup(formatString(obj), opts);
            return opts.markup ? string_markup_1.markupTag('color', val, { fg: 'green' }) : val;
        }
        case 'bigint':
        case 'number': {
            const val = formatNumber(obj);
            return opts.markup ? string_markup_1.markupTag('color', val, { fg: 'yellow' }) : val;
        }
        case 'boolean': {
            const val = formatBoolean(obj);
            return opts.markup ? string_markup_1.markupTag('color', val, { fg: 'yellow' }) : val;
        }
        case 'undefined': {
            const val = formatUndefined();
            return opts.markup ? string_markup_1.markupTag('color', val, { fg: 'brightBlack' }) : val;
        }
        case 'function':
            return formatFunction(obj, opts);
        case 'object':
            return formatObjectish(obj, opts);
        default:
            throw new Error('Unknown type');
    }
}
exports.default = prettyFormat;
function joinList(items, opts) {
    if (items.length === 0) {
        return '';
    }
    const lines = [];
    for (const item of items) {
        lines.push(`${opts.indent}${item}`);
    }
    return lines.join('\n');
}
function isNativeFunction(val) {
    return val.toString().endsWith('{ [native code] }');
}
function formatSymbol(val) {
    return String(val);
}
function formatString(val) {
    return string_escape_1.escapeString(val, {
        quote: "'",
    });
}
// This function is used by rome-json so make sure it can parse whatever you return here
function formatNumber(val) {
    if (typeof val === 'bigint') {
        return string_utils_1.humanizeNumber(val, '_');
    }
    else if (isNaN(val)) {
        return 'NaN';
    }
    else if (Object.is(val, -0)) {
        return '-0';
    }
    else if (isFinite(val)) {
        return string_utils_1.humanizeNumber(val, '_');
    }
    else if (Object.is(val, -Infinity)) {
        return '-Infinity';
    }
    else if (Object.is(val, +Infinity)) {
        return 'Infinity';
    }
    else {
        throw new Error("Don't know how to format this number");
    }
}
exports.formatNumber = formatNumber;
function formatUndefined() {
    return 'undefined';
}
function formatNull() {
    return 'null';
}
function formatBoolean(val) {
    return val === true ? 'true' : 'false';
}
function formatFunction(val, opts) {
    const name = val.name === '' ? 'anonymous' : maybeEscapeMarkup(val.name, opts);
    let label = `Function ${name}`;
    if (isNativeFunction(val)) {
        label = `Native` + label;
    }
    if (Object.keys(val).length === 0) {
        return label;
    }
    // rome-ignore lint/noExplicitAny
    return formatObject(label, val, opts, []);
}
function getExtraObjectProps(obj, opts) {
    const props = [];
    const ignoreKeys = {};
    if (obj instanceof Map) {
        for (const [key, val] of obj) {
            const formattedKey = typeof key === 'string' ? formatKey(key, opts) : prettyFormat(key, opts);
            props.push(`${formattedKey} => ${prettyFormat(val, opts)}`);
        }
    }
    else if (typescript_helpers_1.isIterable(obj)) {
        let i = 0;
        for (const val of obj) {
            ignoreKeys[String(i++)] = val;
            props.push(`${prettyFormat(val, opts)}`);
        }
    }
    return { ignoreKeys, props };
}
function formatKey(rawKey, opts) {
    const key = maybeEscapeMarkup(rawKey, opts);
    // Format as a string if it contains any special characters
    if (/[^A-Za-z0-9_$]/g.test(key)) {
        return formatString(key);
    }
    else {
        return key;
    }
}
// These are object keys that should always go at the top and ignore any alphabetization
// This is fairly arbitrary but should include generic identifier keys
exports.PRIORITIZE_KEYS = ['id', 'type', 'kind', 'key', 'name', 'value'];
function sortKeys(obj) {
    const sortedKeys = new Set(Object.keys(obj).sort(string_utils_1.naturalCompare));
    const priorityKeys = [];
    const otherKeys = [];
    const objectKeys = [];
    for (const key of exports.PRIORITIZE_KEYS) {
        if (sortedKeys.has(key)) {
            priorityKeys.push({ key, object: false });
            sortedKeys.delete(key);
        }
    }
    for (const key of sortedKeys) {
        const val = obj[key];
        // Objects with properties should be at the bottom
        let isObject = false;
        if (typeof val === 'object' && val != null && Object.keys(val).length > 0) {
            isObject = true;
        }
        if (Array.isArray(val) && val.length > 0) {
            isObject = true;
        }
        if (isObject) {
            objectKeys.push({ key, object: true });
        }
        else {
            otherKeys.push({ key, object: false });
        }
    }
    return [...priorityKeys, ...otherKeys, ...objectKeys];
}
function lineCount(str) {
    return str.split('\n').length;
    formatKey;
}
function lineCountCompare(a, b) {
    return lineCount(a) - lineCount(b);
}
function formatObject(label, obj, opts, labelKeys) {
    // Detect circular references, and create a pointer to the specific value
    const { stack } = opts;
    if (stack.length > 0 && stack.includes(obj)) {
        label = `Circular ${label} ${stack.indexOf(obj)}`;
        return opts.markup ? string_markup_1.markupTag('color', label, { fg: 'cyan' }) : label;
    }
    //
    const nextOpts = {
        ...opts,
        stack: [...stack, obj],
        depth: opts.depth + 1,
        indent: opts.indent + INDENT,
    };
    const { ignoreKeys, props } = getExtraObjectProps(obj, nextOpts);
    // For props that have object values, we always put them at the end, sorted by line count
    const objProps = [];
    // Get string props
    for (const { key, object } of sortKeys(obj)) {
        const val = obj[key];
        if (key in ignoreKeys && ignoreKeys[key] === val) {
            continue;
        }
        if (opts.compact && val === undefined) {
            continue;
        }
        // Ignore any properties already displayed in the label
        if (labelKeys.includes(key)) {
            continue;
        }
        const prop = `${formatKey(key, opts)}: ${prettyFormat(val, nextOpts)}`;
        if (object) {
            objProps.push(prop);
        }
        else {
            props.push(prop);
        }
    }
    // Sort object props by line count and push them on
    for (const prop of objProps.sort(lineCountCompare)) {
        props.push(prop);
    }
    // Get symbol props
    for (const sym of Object.getOwnPropertySymbols(obj)) {
        const val = Reflect.get(obj, sym);
        props.push(`${prettyFormat(sym, opts)}: ${prettyFormat(val, nextOpts)}`);
    }
    //
    let open = '{';
    let close = '}';
    if (typescript_helpers_1.isIterable(obj)) {
        open = '[';
        close = ']';
    }
    //
    let inner = joinList(props, nextOpts);
    if (inner !== '') {
        if (props.length === 1 && !inner.includes('\n')) {
            // Single prop with no newlines shouldn't be indented
            inner = inner.trim();
        }
        else {
            inner = `\n${inner}\n${opts.indent}`;
        }
    }
    label = opts.markup ? string_markup_1.markupTag('color', label, { fg: 'cyan' }) : label;
    return `${label} ${open}${inner}${close}`;
}
function formatRegExp(val) {
    return String(val);
}
function formatDate(val) {
    return val.toISOString();
}
function formatObjectish(val, opts) {
    if (val === null) {
        const val = formatNull();
        return opts.markup ? string_markup_1.markupTag('emphasis', val) : val;
    }
    if (val instanceof RegExp) {
        const str = formatRegExp(val);
        return opts.markup ? string_markup_1.markupTag('color', str, { fg: 'red' }) : str;
    }
    if (val instanceof Date) {
        const str = formatDate(val);
        return opts.markup ? string_markup_1.markupTag('color', str, { fg: 'magenta' }) : str;
    }
    let label = 'null';
    if (val.constructor !== undefined) {
        label = maybeEscapeMarkup(val.constructor.name, opts);
    }
    let labelKeys = [];
    // If there's a string type or kind property then use it as the label
    if (typeof val.type === 'string') {
        label = maybeEscapeMarkup(val.type, opts);
        labelKeys.push('type');
    }
    else if (typeof val.kind === 'string') {
        label = maybeEscapeMarkup(val.kind, opts);
        labelKeys.push('kind');
    }
    return formatObject(label, val, opts, labelKeys);
}
