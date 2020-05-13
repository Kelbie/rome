"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineOrSpace = {
    type: 'Line',
    mode: 'space',
};
exports.softline = {
    type: 'Line',
    mode: 'soft',
};
exports.hardline = {
    type: 'Line',
    mode: 'hard',
};
exports.space = {
    type: 'Space',
};
function group(contents, shouldBreak = false) {
    return {
        type: 'Group',
        contents,
        shouldBreak,
    };
}
exports.group = group;
function comment(value) {
    return {
        type: 'Comment',
        value,
    };
}
exports.comment = comment;
function indent(contents) {
    return {
        type: 'Indent',
        contents,
    };
}
exports.indent = indent;
function mark(loc, prop) {
    return {
        type: 'PositionMarker',
        loc,
        prop,
    };
}
exports.mark = mark;
function concat(parts) {
    if (parts.length === 0) {
        return '';
    }
    if (parts.length === 1) {
        return parts[0];
    }
    return {
        type: 'Concat',
        parts,
    };
}
exports.concat = concat;
function ifBreak(breakContents, flatContents) {
    return {
        type: 'IfBreak',
        breakContents,
        flatContents,
    };
}
exports.ifBreak = ifBreak;
function join(separator, tokens) {
    if (tokens.length === 0) {
        return '';
    }
    if (tokens.length === 1) {
        return tokens[0];
    }
    const parts = [];
    for (let i = 0; i < tokens.length; i++) {
        if (i > 0) {
            parts.push(separator);
        }
        parts.push(tokens[i]);
    }
    return concat(parts);
}
exports.join = join;
function lineSuffix(contents) {
    return {
        type: 'LineSuffix',
        contents,
    };
}
exports.lineSuffix = lineSuffix;
