"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diagnostics_1 = require("@romejs/diagnostics");
const typescript_helpers_1 = require("@romejs/typescript-helpers");
const parser_core_1 = require("@romejs/parser-core");
const ob1_1 = require("@romejs/ob1");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const string_escape_1 = require("@romejs/string-escape");
const path_1 = require("@romejs/path");
function isComputedPart(part) {
    return typeof part === 'number' || !js_ast_utils_1.isValidIdentifierName(part);
}
class Consumer {
    constructor(opts) {
        this.path = opts.filePath;
        this.filename = this.path === undefined ? undefined : this.path.join();
        this.value = opts.value;
        this.parent = opts.parent;
        this.keyPath = opts.objectPath;
        this.context = opts.context;
        this.onDefinition = opts.onDefinition;
        this.propertyMetadata = opts.propertyMetadata;
        this.usedNames = new Set(opts.usedNames);
        this.forkCache = new Map();
        this.forceDiagnosticTarget = opts.forceDiagnosticTarget;
        this.declared = false;
        // See shouldDispatchUnexpected for explanation
        this.hasHandledUnexpected = false;
        this.handleUnexpected = opts.handleUnexpectedDiagnostic;
    }
    capture() {
        let diagnostics = [];
        const definitions = [];
        const consumer = this.clone({
            onDefinition: (def, consumer) => {
                if (this.onDefinition !== undefined) {
                    this.onDefinition(def, consumer);
                }
                definitions.push(def);
            },
            handleUnexpectedDiagnostic(diag) {
                diagnostics.push(diag);
            },
        });
        return { consumer, definitions, diagnostics };
    }
    async bufferDiagnostics(callback) {
        const { diagnostics, consumer } = await this.capture();
        const result = await callback(consumer);
        if (result === undefined || diagnostics.length > 0) {
            throw new diagnostics_1.DiagnosticsError('Captured diagnostics', diagnostics);
        }
        return result;
    }
    handleThrownDiagnostics(callback) {
        if (this.handleUnexpected === undefined) {
            callback();
        }
        else {
            const { diagnostics } = diagnostics_1.catchDiagnosticsSync(callback);
            if (diagnostics !== undefined) {
                for (const diag of diagnostics) {
                    this.handleUnexpected(diag);
                }
            }
        }
    }
    declareDefinition(partialDef, inputName) {
        if (this.declared) {
            return;
        }
        if (this.onDefinition === undefined) {
            return;
        }
        const metadata = {
            inputName,
            ...this.propertyMetadata,
        };
        const def = {
            ...partialDef,
            objectPath: this.keyPath,
            metadata,
        };
        this.declared = true;
        this.onDefinition(def, this);
    }
    getDiagnosticLocation(target = 'all') {
        const { getDiagnosticPointer } = this.context;
        if (getDiagnosticPointer === undefined) {
            return {};
        }
        const { forceDiagnosticTarget } = this;
        if (forceDiagnosticTarget !== undefined) {
            target = forceDiagnosticTarget;
        }
        return getDiagnosticPointer(this.keyPath, target);
    }
    getLocation(target) {
        const location = this.getDiagnosticLocation(target);
        if (location === undefined ||
            location.start === undefined ||
            location.end === undefined) {
            return {
                filename: this.filename,
                start: parser_core_1.UNKNOWN_POSITION,
                end: parser_core_1.UNKNOWN_POSITION,
            };
        }
        else {
            return {
                filename: location.filename,
                start: location.start,
                end: location.end,
            };
        }
    }
    getLocationRange(startIndex, endIndex = startIndex, target) {
        const loc = this.getLocation(target);
        if (loc.start === parser_core_1.UNKNOWN_POSITION) {
            return loc;
        }
        const { start, end } = loc;
        // We don't support handling line differences here... yet?
        if (start.line !== end.line) {
            return loc;
        }
        return {
            ...loc,
            start: {
                ...start,
                column: ob1_1.ob1Add(start.column, startIndex),
                index: ob1_1.ob1Add(start.index, startIndex),
            },
            end: {
                ...start,
                column: ob1_1.ob1Add(start.column, endIndex),
                index: ob1_1.ob1Add(start.index, endIndex),
            },
        };
    }
    getKey() {
        return this.clone({
            forceDiagnosticTarget: 'key',
            value: this.getParentKey(),
        });
    }
    getParentKey() {
        return this.keyPath[this.keyPath.length - 1];
    }
    hasChangedFromSource() {
        const { getOriginalValue } = this.context;
        if (getOriginalValue === undefined) {
            return false;
        }
        const originalValue = getOriginalValue(this.keyPath);
        return !this.wasInSource() || this.value !== originalValue;
    }
    wasInSource() {
        return this.getDiagnosticLocation() !== undefined;
    }
    getKeyPathString(path = this.keyPath) {
        const { normalizeKey } = this.context;
        let str = '';
        for (let i = 0; i < path.length; i++) {
            let part = path[i];
            const nextPart = path[i + 1];
            if (typeof part === 'string' && normalizeKey !== undefined) {
                part = normalizeKey(part);
            }
            // If we are a computed property then wrap in brackets, the previous part would not have inserted a dot
            // We allow a computed part at the beginning of a path
            if (isComputedPart(part) && i > 0) {
                const inner = typeof part === 'number'
                    ? String(part)
                    : string_escape_1.escapeString(part, {
                        quote: "'",
                    });
                str += `[${inner}]`;
            }
            else {
                if (nextPart === undefined || isComputedPart(nextPart)) {
                    // Don't append a dot if there are no parts or the next is computed
                    str += part;
                }
                else {
                    str += `${part}.`;
                }
            }
        }
        return str;
    }
    generateUnexpectedMessage(msg, opts) {
        const { at = 'suffix', atParent = false } = opts;
        const { parent } = this;
        let target = this;
        if (atParent) {
            if (parent === undefined) {
                // Cannot target the parent if it does not exist
                return msg;
            }
            else {
                target = parent;
            }
        }
        if (at === 'suffix') {
            msg += ` at <emphasis>${target.getKeyPathString()}</emphasis>`;
        }
        else {
            msg = `<emphasis>${target.getKeyPathString()}</emphasis> ${msg}`;
        }
        return msg;
    }
    unexpected(description = diagnostics_1.descriptions.CONSUME.INVALID, opts = {}) {
        const { target = 'value' } = opts;
        const { filename } = this;
        let location = this.getDiagnosticLocation(target);
        const fromSource = location !== undefined;
        const message = this.generateUnexpectedMessage(description.message.value, opts);
        description = {
            ...description,
            message: diagnostics_1.createBlessedDiagnosticMessage(message),
        };
        const advice = [...(description.advice || [])];
        // Make the errors more descriptive
        if (fromSource) {
            if (this.hasChangedFromSource()) {
                advice.push({
                    type: 'log',
                    category: 'warn',
                    text: 'Our internal value has been modified since we read the original source',
                });
            }
        }
        else {
            // Go up the consumer tree and take the position from the first consumer found in the source
            let consumer = this;
            do {
                const possibleLocation = consumer.getDiagnosticLocation(target);
                if (possibleLocation !== undefined) {
                    location = possibleLocation;
                    break;
                }
                consumer = consumer.parent;
            } while (consumer !== undefined);
            // If consumer is undefined and we have no filename then we were not able to find a location,
            // in this case, just throw a normal error
            if (consumer === undefined && filename === undefined) {
                throw new Error(message);
            }
            // Warn that we didn't find this value in the source if it's parent wasn't either
            if (this.parent === undefined || !this.parent.wasInSource()) {
                advice.push({
                    type: 'log',
                    category: 'warn',
                    text: `This value was expected to be found at <emphasis>${this.getKeyPathString()}</emphasis> but was not in the original source`,
                });
            }
        }
        if (opts.loc !== undefined) {
            location = opts.loc;
        }
        if (location === undefined) {
            throw new Error(message);
        }
        const diagnostic = {
            description: {
                category: this.context.category,
                ...description,
                advice,
            },
            location: {
                ...location,
                filename: this.filename,
            },
        };
        const err = diagnostics_1.createSingleDiagnosticError(diagnostic);
        if (this.handleUnexpected === undefined) {
            throw err;
        }
        else {
            if (this.shouldDispatchUnexpected()) {
                this.handleUnexpected(diagnostic);
                this.hasHandledUnexpected = true;
            }
            // Still allow throwing the diagnostic
            return err;
        }
    }
    // Only dispatch a single error for the current consumer, and suppress any if we have a parent consumer with errors
    // We do this since we could be producing redundant stale errors based on
    // results we've normalized to allow us to continue
    shouldDispatchUnexpected() {
        if (this.hasHandledUnexpected) {
            return false;
        }
        const { parent } = this;
        if (parent !== undefined) {
            return parent.shouldDispatchUnexpected();
        }
        return true;
    }
    clone(opts) {
        return new Consumer({
            usedNames: this.usedNames,
            onDefinition: this.onDefinition,
            handleUnexpectedDiagnostic: this.handleUnexpected,
            filePath: this.path,
            context: this.context,
            value: this.value,
            parent: this.parent,
            objectPath: this.keyPath,
            propertyMetadata: this.propertyMetadata,
            ...opts,
        });
    }
    fork(key, value, propertyMetadata) {
        // We require this cache as we sometimes want to store state about a forked property such as used items
        const cached = this.forkCache.get(String(key));
        if (cached !== undefined &&
            cached.value === value &&
            (cached.propertyMetadata === undefined ||
                cached.propertyMetadata === propertyMetadata)) {
            return cached;
        }
        const forked = this.clone({
            propertyMetadata,
            value,
            parent: this,
            objectPath: [...this.keyPath, key],
        });
        this.forkCache.set(String(key), forked);
        return forked;
    }
    _normalizeValueForSet(value) {
        if (value instanceof Set) {
            return Array.from(value);
        }
        if (value instanceof Map) {
            const obj = {};
            for (const [key, val] of value) {
                obj[key] = val;
            }
            return obj;
        }
        return value;
    }
    getValue(def) {
        if (this.exists()) {
            return this.value;
        }
        else {
            return def;
        }
    }
    setValue(rawValue) {
        const value = this._normalizeValueForSet(rawValue);
        this.value = value;
        // If we're at the root (as indicated by the lack of these properties) then go no where else
        const { parent, keyPath } = this;
        if (parent === undefined || keyPath.length === 0) {
            return this;
        }
        // Validate the parent is an object
        const parentValue = parent.asUnknown();
        if (parentValue === undefined ||
            parentValue === null ||
            typeof parentValue !== 'object') {
            throw parent.unexpected(diagnostics_1.descriptions.CONSUME.SET_PROPERTY_NON_OBJECT);
        }
        // Mutate the parent
        const parentObj = parent.asOriginalUnknownObject();
        const key = this.getParentKey();
        parentObj[String(key)] = value;
        parent.setValue(parentObj);
        return this;
    }
    has(key) {
        return this.get(key).asUnknown() != null;
    }
    setProperty(key, value) {
        return this.get(key).setValue(value);
    }
    get(key, metadata) {
        const value = this.asOriginalUnknownObject();
        this.markUsedProperty(key);
        return this.fork(key, value[key], metadata);
    }
    markUsedProperty(name) {
        this.usedNames.add(name);
    }
    enforceUsedProperties(type = 'property', recursive = true) {
        if (!this.isObject()) {
            return;
        }
        let knownProperties = Array.from(this.usedNames.keys());
        const { normalizeKey } = this.context;
        if (normalizeKey !== undefined) {
            knownProperties = knownProperties.map((key) => normalizeKey(key));
        }
        for (const [key, value] of this.asMap(false, false)) {
            if (!this.usedNames.has(key)) {
                value.unexpected(diagnostics_1.descriptions.CONSUME.UNUSED_PROPERTY(this.getKeyPathString([key]), type, knownProperties), {
                    target: 'key',
                    at: 'suffix',
                    atParent: true,
                });
            }
            if (recursive) {
                value.enforceUsedProperties(type, true);
            }
        }
    }
    asPossibleParsedJSON() {
        if (typeof this.asUnknown() === 'string') {
            return this.clone({
                value: JSON.parse(this.asString()),
            });
        }
        else {
            return this;
        }
    }
    // JSON
    asJSONValue() {
        const { value } = this;
        switch (typeof value) {
            case 'number':
            case 'string':
            case 'boolean':
                return value;
        }
        if (value === null) {
            return null;
        }
        if (Array.isArray(value)) {
            return this.asJSONArray();
        }
        if (this.isObject()) {
            return this.asJSONObject();
        }
        this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_JSON_VALUE);
        return '';
    }
    asJSONArray() {
        const arr = [];
        for (const value of this.asArray()) {
            arr.push(value.asJSONValue());
        }
        return arr;
    }
    asJSONObject() {
        const obj = {};
        for (const [key, value] of this.asMap()) {
            obj[key] = value.asJSONPropertyValue();
        }
        return obj;
    }
    asJSONPropertyValue() {
        if (this.exists()) {
            return this.asJSONValue();
        }
        else {
            return undefined;
        }
    }
    exists() {
        return this.value != null;
    }
    isObject() {
        const { value } = this;
        return (typeof value === 'object' &&
            value !== null &&
            value.constructor === Object);
    }
    asUnknownObject(optional = false) {
        this.declareDefinition({
            type: 'object',
            default: undefined,
            required: !optional,
        });
        return {
            ...this.asOriginalUnknownObject(optional),
        };
    }
    asOriginalUnknownObject(optional = false) {
        if (optional === true && !this.exists()) {
            return {};
        }
        const { value } = this;
        if (!typescript_helpers_1.isPlainObject(value)) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_OBJECT);
            return {};
        }
        return value;
    }
    asMap(optional, markUsed = true) {
        this.declareDefinition({
            type: 'object',
            default: undefined,
            required: !optional,
        });
        const value = this.asOriginalUnknownObject(optional);
        const map = new Map();
        for (const key in value) {
            if (markUsed) {
                this.markUsedProperty(key);
            }
            map.set(key, this.fork(key, value[key]));
        }
        return map;
    }
    asPlainArray(optional = false) {
        this.declareDefinition({
            type: 'array',
            default: undefined,
            required: !optional,
        });
        if (optional === true && !this.exists()) {
            return [];
        }
        const { value } = this;
        if (!Array.isArray(value)) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_ARRAY);
            return [];
        }
        return [...value];
    }
    asArray(optional) {
        const arr = this.asPlainArray(optional);
        return arr.map((val, index) => {
            return this.fork(index, val);
        });
    }
    asImplicitArray() {
        if (Array.isArray(this.asUnknown())) {
            return this.asArray();
        }
        else if (this.exists()) {
            return [this];
        }
        else {
            return [];
        }
    }
    asDateOrVoid(def) {
        this.declareDefinition({
            type: 'date',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredDate(def);
        }
        else {
            return undefined;
        }
    }
    asDate(def) {
        this.declareDefinition({
            type: 'date',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredDate(def);
    }
    asUndeclaredDate(def) {
        const value = this.getValue(def);
        if (!(value instanceof Date)) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_DATE);
            return new Date();
        }
        return value;
    }
    asBooleanOrVoid(def) {
        this.declareDefinition({
            type: 'boolean',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredBoolean(def);
        }
        else {
            return undefined;
        }
    }
    asBoolean(def) {
        this.declareDefinition({
            type: 'boolean',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredBoolean(def);
    }
    asUndeclaredBoolean(def) {
        const value = this.getValue(def);
        if (typeof value !== 'boolean') {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_BOOLEAN);
            return false;
        }
        return value;
    }
    asStringOrVoid(def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredString(def);
        }
        else {
            return undefined;
        }
    }
    asString(def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredString(def);
    }
    asUndeclaredString(def) {
        const value = this.getValue(def);
        if (typeof value !== 'string') {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_STRING);
            return '';
        }
        return value;
    }
    asStringSet(validValues, def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: def === undefined,
            allowedValues: validValues,
        });
        return this.asUndeclaredStringSet(validValues, def);
    }
    asUndeclaredStringSet(validValues, def) {
        const value = this.asUndeclaredString(String(def));
        // @ts-ignore
        if (validValues.includes(value)) {
            // @ts-ignore
            return value;
        }
        else {
            this.unexpected(diagnostics_1.descriptions.CONSUME.INVALID_STRING_SET_VALUE(value, 
            // rome-ignore lint/noExplicitAny
            validValues), {
                target: 'value',
            });
            return validValues[0];
        }
    }
    asStringSetOrVoid(validValues, def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: false,
            allowedValues: validValues,
        });
        if (this.exists()) {
            return this.asUndeclaredStringSet(validValues, def);
        }
        else {
            return undefined;
        }
    }
    asBigIntOrVoid(def) {
        this.declareDefinition({
            type: 'bigint',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredBigInt(def);
        }
        else {
            return undefined;
        }
    }
    asBigInt(def) {
        this.declareDefinition({
            type: 'bigint',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredBigInt(def);
    }
    asUndeclaredBigInt(def) {
        const value = this.getValue(def);
        if (typeof value === 'number') {
            return BigInt(value);
        }
        if (typeof value === 'bigint') {
            return value;
        }
        this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_BIGINT);
        return BigInt('0');
    }
    _declareOptionalFilePath(def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: false,
        }, 'path');
    }
    asURLFilePath(def) {
        const path = this.asUnknownFilePath(def);
        if (path.isURL()) {
            return path.assertURL();
        }
        else {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_URL);
            return path_1.createURLFilePath('unknown://').append(path);
        }
    }
    asURLFilePathOrVoid(def) {
        if (this.exists()) {
            return this.asURLFilePath(def);
        }
        else {
            this._declareOptionalFilePath(def);
            return undefined;
        }
    }
    asUnknownFilePath(def) {
        this.declareDefinition({
            type: 'string',
            default: def,
            required: def === undefined,
        }, 'path');
        return path_1.createUnknownFilePath(this.asUndeclaredString(def));
    }
    asUnknownFilePathOrVoid(def) {
        if (this.exists()) {
            return this.asUnknownFilePath(def);
        }
        else {
            this._declareOptionalFilePath(def);
            return undefined;
        }
    }
    asAbsoluteFilePath(def, cwd) {
        const path = this.asUnknownFilePath(def);
        if (path.isAbsolute()) {
            return path.assertAbsolute();
        }
        else if (cwd !== undefined && path.isRelative()) {
            return cwd.resolve(path);
        }
        else {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_ABSOLUTE_PATH);
            return path_1.createAbsoluteFilePath('/').append(path);
        }
    }
    asAbsoluteFilePathOrVoid(def, cwd) {
        if (this.exists()) {
            return this.asAbsoluteFilePath(def, cwd);
        }
        else {
            this._declareOptionalFilePath(def);
            return undefined;
        }
    }
    asRelativeFilePath(def) {
        const path = this.asUnknownFilePath(def);
        if (path.isRelative()) {
            return path.assertRelative();
        }
        else {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_RELATIVE_PATH);
            return path.toExplicitRelative();
        }
    }
    asRelativeFilePathOrVoid(def) {
        if (this.exists()) {
            return this.asRelativeFilePath(def);
        }
        else {
            this._declareOptionalFilePath(def);
            return undefined;
        }
    }
    asExplicitRelativeFilePath(def) {
        const path = this.asRelativeFilePath(def);
        if (path.isExplicitRelative()) {
            return path;
        }
        else {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_EXPLICIT_RELATIVE_PATH);
            return path.toExplicitRelative();
        }
    }
    asExplicitRelativeFilePathOrVoid(def) {
        if (this.exists()) {
            return this.asExplicitRelativeFilePath(def);
        }
        else {
            this._declareOptionalFilePath(def);
            return undefined;
        }
    }
    asNumberOrVoid(def) {
        this.declareDefinition({
            type: 'number',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredNumber(def);
        }
        else {
            return undefined;
        }
    }
    asZeroIndexedNumber() {
        return ob1_1.ob1Coerce0(this.asNumber());
    }
    asOneIndexedNumber() {
        return ob1_1.ob1Coerce1(this.asNumber());
    }
    asNumberFromString(def) {
        this.declareDefinition({
            type: 'number',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredNumberFromString(def);
    }
    asNumberFromStringOrVoid(def) {
        this.declareDefinition({
            type: 'number',
            default: def,
            required: false,
        });
        if (this.exists()) {
            return this.asUndeclaredNumberFromString(def);
        }
        else {
            return undefined;
        }
    }
    asUndeclaredNumberFromString(def) {
        if (def !== undefined && !this.exists()) {
            return def;
        }
        const str = this.asUndeclaredString();
        const num = Number(str);
        if (isNaN(num)) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_VALID_NUMBER);
            return NaN;
        }
        else {
            return num;
        }
    }
    asNumber(def) {
        this.declareDefinition({
            type: 'number',
            default: def,
            required: def === undefined,
        });
        return this.asUndeclaredNumber(def);
    }
    asNumberInRange(opts) {
        const num = this.asUndeclaredNumber(opts.default);
        const min = ob1_1.ob1Get(opts.min);
        const max = ob1_1.ob1Get(opts.max);
        this.declareDefinition({
            type: 'number',
            default: opts.default,
            required: opts.default !== undefined,
            min,
            max,
        });
        // Nice error message when both min and max are specified
        if (min !== undefined && max !== undefined && (num < min || num > max)) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_NUMBER_BETWEEN(min, max));
            return num;
        }
        if (min !== undefined && num < min) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_NUMBER_HIGHER(min));
        }
        if (max !== undefined && num > max) {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_NUMBER_LOWER(max));
        }
        return num;
    }
    asUndeclaredNumber(def) {
        const value = this.getValue(def);
        if (typeof value !== 'number') {
            this.unexpected(diagnostics_1.descriptions.CONSUME.EXPECTED_NUMBER);
            return 0;
        }
        return value;
    }
    asUnknown() {
        return this.value;
    }
    // rome-ignore lint/noExplicitAny
    asAny() {
        return this.value;
    }
}
exports.default = Consumer;
