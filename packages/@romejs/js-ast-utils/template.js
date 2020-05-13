"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const js_compiler_1 = require("@romejs/js-compiler");
const removeLoc_1 = require("./removeLoc");
const js_parser_1 = require("@romejs/js-parser");
const path_1 = require("@romejs/path");
const isIdentifierish_1 = require("./isIdentifierish");
const templateCache = new Map();
function getTemplate(strs) {
    const cached = templateCache.get(strs);
    if (cached) {
        return cached;
    }
    // calculate amount of placeholders to insert
    const pathCount = strs.length - 1;
    // create path ids
    let placeholders = {};
    const placeholderIds = [];
    for (let i = 0; i < pathCount; i++) {
        const id = `__${String(i)}__`;
        placeholderIds.push(id);
        placeholders[id] = undefined;
    }
    // interpolate placeholders and original code
    let code = '';
    for (let i = 0; i < strs.length; i++) {
        // add original part of code
        code += strs[i];
        // add in placeholder
        const placeholder = placeholderIds[i];
        if (placeholder) {
            code += placeholder;
        }
    }
    // parse the interpolated code
    let ast = js_parser_1.parseJS({
        input: code,
        sourceType: 'template',
        path: path_1.createUnknownFilePath('template'),
    });
    // remove `loc` properties
    ast = js_ast_1.program.assert(removeLoc_1.default(ast));
    // traverse and find placeholders paths
    function collectPlaceholderPaths(path) {
        const { node } = path;
        if (isIdentifierish_1.default(node) && node.name in placeholders) {
            placeholders[node.name] = {
                type: node.type,
                path: path.getPathKeys(),
            };
        }
        return node;
    }
    const context = new js_compiler_1.CompilerContext({
        ast,
    });
    context.reduce(ast, [{ name: 'collectPlaceholderPaths', enter: collectPlaceholderPaths }]);
    const placeholderPaths = [];
    for (const id in placeholders) {
        const path = placeholders[id];
        if (path === undefined) {
            throw new Error(`Failed to find placeholder path for ${id}`);
        }
        else {
            placeholderPaths.push(path);
        }
    }
    return { ast, placeholderPaths };
}
function createIdentifier(substitute, expectedIdType) {
    if (typeof substitute === 'string') {
        // @ts-ignore: No idea why this error exists
        return {
            type: expectedIdType,
            name: substitute,
        };
    }
    else {
        return substitute;
    }
}
function template(strs, ...substitutions) {
    const { ast, placeholderPaths } = getTemplate(strs);
    // no substitutions so we can just return the ast!
    if (!substitutions.length) {
        return ast;
    }
    // this case should never be hit
    if (placeholderPaths.length !== substitutions.length) {
        throw new Error('Expected subtituions to be the same length as paths');
    }
    const newAst = { ...ast };
    for (let i = 0; i < placeholderPaths.length; i++) {
        const { type, path } = placeholderPaths[i];
        const substitute = createIdentifier(substitutions[i], type);
        // rome-ignore lint/noExplicitAny
        let target = newAst;
        for (let i = 0; i < path.length; i++) {
            const key = path[i];
            const isLast = i === path.length - 1;
            if (isLast) {
                target[key] = substitute;
            }
            else {
                let currTarget = target[key];
                if (Array.isArray(currTarget)) {
                    currTarget = currTarget.slice();
                }
                else {
                    currTarget = { ...currTarget };
                }
                target[key] = currTarget;
                target = currTarget;
            }
        }
    }
    return newAst;
}
exports.default = template;
template.expression = (strs, ...substitutions) => {
    const first = template.statement(strs, ...substitutions);
    // Ensure that the single statement is an ExpressionStatement
    if (first.type !== 'ExpressionStatement') {
        throw new Error('Single statement should be an ExpressionStatement');
    }
    return first.expression;
};
template.statement = (strs, ...substitutions) => {
    // Parse the template, with caching
    const ast = js_ast_1.program.assert(template(strs, ...substitutions));
    // Ensure that there's only a single statement in the Program body
    const body = ast.body;
    if (body.length !== 1) {
        throw new Error("More than one statement isn't allowed for a template.");
    }
    return body[0];
};
