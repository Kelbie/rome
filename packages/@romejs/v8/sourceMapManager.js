"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ob1_1 = require("@romejs/ob1");
const errors_1 = require("./errors");
let inited = false;
const maps = new Map();
// In case we want to defer the reading of a source map completely (parsing is always deferred)
const factories = new Map();
function prepareStackTrace(err, frames) {
    try {
        addErrorFrames(err, frames);
        return buildStackString(err);
    }
    catch (err2) {
        return `${err.name}: ${err.message}\n  Failed to generate stacktrace: ${err2.message}`;
    }
}
function init() {
    if (!inited) {
        inited = true;
        Error.prepareStackTrace = prepareStackTrace;
    }
}
exports.init = init;
function teardown() {
    Error.prepareStackTrace = undefined;
}
exports.teardown = teardown;
function buildStackString(err) {
    const { frames } = errors_1.getErrorStructure(err);
    const lines = [];
    lines.push(`${err.name}: ${err.message}`);
    for (const frame of frames) {
        const { resolvedLocation, methodName, functionName, typeName, isNative, isAsync, isEval, isConstructor, filename, lineNumber, columnNumber, } = frame;
        const parts = [];
        if (isAsync) {
            parts.push('await');
        }
        if (isEval) {
            parts.push('eval');
        }
        if (isConstructor) {
            parts.push('new');
        }
        let name = '<anonymous';
        if (functionName !== undefined) {
            name = functionName;
        }
        if (methodName !== undefined) {
            name = methodName;
        }
        if (typeName !== undefined) {
            parts.push(`${typeName}.${name}`);
        }
        else {
            parts.push(name);
        }
        if (isNative) {
            parts.push('native');
        }
        else if (filename !== undefined &&
            lineNumber !== undefined &&
            columnNumber !== undefined) {
            parts.push(`(${filename}:${lineNumber}:${columnNumber})`);
        }
        if (resolvedLocation === false) {
            parts.push('generated source location');
        }
        lines.push(`  at ${parts.join(' ')}`);
    }
    return lines.join('\n');
}
function noNull(val) {
    if (val === null) {
        return undefined;
    }
    else {
        return val;
    }
}
function addErrorFrames(err, frames) {
    if (err[errors_1.ERROR_FRAMES_PROP]) {
        return;
    }
    let builtFrames = frames.map((frameApi) => {
        const filename = frameApi.getFileName();
        const lineNumber = frameApi.getLineNumber();
        const columnNumber = frameApi.getColumnNumber();
        const frame = {
            typeName: noNull(frameApi.getTypeName()),
            functionName: noNull(frameApi.getFunctionName()),
            methodName: noNull(frameApi.getMethodName()),
            isTopLevel: frameApi.isToplevel(),
            isEval: frameApi.isEval(),
            isNative: frameApi.isNative(),
            isConstructor: frameApi.isConstructor(),
            // TODO frameApi.isAsync
            isAsync: false,
            resolvedLocation: true,
            filename: noNull(filename),
            lineNumber: lineNumber == null ? undefined : ob1_1.ob1Coerce1(lineNumber),
            // Rome expects 0-indexed columns, V8 provides 1-indexed
            columnNumber: columnNumber == null
                ? undefined
                : ob1_1.ob1Coerce1To0(columnNumber),
        };
        if (frame.filename !== undefined &&
            frame.lineNumber !== undefined &&
            frame.columnNumber !== undefined) {
            const { found, line, column, filename, name } = resolveLocation(frame.filename, frame.lineNumber, frame.columnNumber);
            return {
                ...frame,
                functionName: frame.functionName === undefined
                    ? name
                    : frame.functionName,
                methodName: frame.methodName === undefined ? name : frame.methodName,
                resolvedLocation: found,
                lineNumber: line,
                columnNumber: column,
                filename,
            };
        }
        else {
            return frame;
        }
    });
    err[errors_1.ERROR_FRAMES_PROP] = builtFrames;
}
function resolveLocation(filename, line, column) {
    const map = getSourceMap(filename);
    if (map === undefined) {
        return {
            found: true,
            filename,
            line,
            column,
            name: undefined,
        };
    }
    const resolved = map.approxOriginalPositionFor(line, column);
    if (resolved === undefined) {
        return {
            found: false,
            filename,
            line,
            column,
            name: undefined,
        };
    }
    return {
        found: true,
        filename: resolved.source,
        line: resolved.line,
        column: resolved.column,
        name: resolved.name,
    };
}
exports.resolveLocation = resolveLocation;
// Add a source map factory. We jump through some hoops to return a function to remove the source map.
// We make sure not to remove the source map if it's been subsequently added by another call.
function addSourceMap(filename, factory) {
    init();
    let map;
    function factoryCapture() {
        map = factory();
        return map;
    }
    factories.set(filename, factoryCapture);
    return () => {
        if (factories.get(filename) === factoryCapture) {
            factories.delete(filename);
        }
        if (maps.get(filename) === map) {
            maps.delete(filename);
        }
    };
}
exports.addSourceMap = addSourceMap;
function getSourceMap(filename) {
    if (maps.has(filename)) {
        return maps.get(filename);
    }
    const factory = factories.get(filename);
    if (factory !== undefined) {
        factories.delete(filename);
        const map = factory();
        maps.set(filename, map);
        return map;
    }
    return undefined;
}
exports.getSourceMap = getSourceMap;
