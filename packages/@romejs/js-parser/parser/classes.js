"use strict";
/**
 * Portions Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../tokenizer/types");
const index_1 = require("./index");
const ob1_1 = require("@romejs/ob1");
const expression_1 = require("./expression");
const diagnostics_1 = require("@romejs/diagnostics");
function parseClassExpression(parser, start) {
    return parser.finalizeNode({
        ...parseClass(parser, start, true),
        type: 'ClassExpression',
    });
}
exports.parseClassExpression = parseClassExpression;
function parseExportDefaultClassDeclaration(parser, start) {
    let { id, ...shape } = parseClass(parser, start, true);
    if (id === undefined) {
        id = {
            type: 'BindingIdentifier',
            name: '*default*',
            // Does this `loc` make sense?
            loc: shape.loc,
        };
    }
    return parser.finalizeNode({
        ...shape,
        type: 'ClassDeclaration',
        id,
    });
}
exports.parseExportDefaultClassDeclaration = parseExportDefaultClassDeclaration;
function parseClassDeclaration(parser, start) {
    const { id, ...shape } = parseClass(parser, start, false);
    if (id === undefined) {
        throw new Error('Expected id');
    }
    return parser.finalizeNode({
        ...shape,
        type: 'ClassDeclaration',
        id,
    });
}
exports.parseClassDeclaration = parseClassDeclaration;
// Parse a class declaration or expression
function parseClass(parser, start, optionalId) {
    parser.pushScope('METHOD', false);
    parser.pushScope('STRICT', true);
    parser.next();
    const { id, typeParameters } = parseClassId(parser, optionalId);
    const { superClass, superTypeParameters, implemented } = parseClassSuper(parser);
    parser.pushScope('CLASS', superClass === undefined ? 'normal' : 'derived');
    const bodyStart = parser.getPosition();
    const body = parseClassBody(parser);
    parser.popScope('CLASS');
    parser.popScope('STRICT');
    parser.popScope('METHOD');
    // We have two finishNodes here to consume the innerComments inside of the body
    // This is since in the Rome AST, we don't have a ClassBody node, so the comment
    // algorithm thinks that the ClassHead location is too broad, and thinks a different
    // node should consume them.
    const meta = parser.finishNode(start, parser.finishNode(bodyStart, {
        type: 'ClassHead',
        body,
        typeParameters,
        superClass,
        superTypeParameters,
        implements: implemented,
    }));
    return {
        loc: parser.finishLoc(start),
        id,
        meta,
    };
}
exports.parseClass = parseClass;
function isClassProperty(parser) {
    return (parser.match(types_1.types.bang) ||
        parser.match(types_1.types.colon) ||
        parser.match(types_1.types.eq) ||
        parser.match(types_1.types.semi) ||
        parser.match(types_1.types.braceR));
}
function isClassMethod(parser) {
    return parser.match(types_1.types.parenL) || parser.isRelational('<');
}
function isNonstaticConstructor(parser, key, meta) {
    // Class property
    if (parser.match(types_1.types.colon)) {
        return false;
    }
    // Static
    if (meta.static) {
        return false;
    }
    if (key.type === 'StaticPropertyKey' &&
        key.value.type === 'Identifier' &&
        key.value.name === 'constructor') {
        return true;
    }
    if (key.value.type === 'StringLiteral' && key.value.value === 'constructor') {
        return true;
    }
    return false;
}
function parseClassBody(parser) {
    // class bodies are implicitly strict
    parser.pushScope('STRICT', true);
    parser.state.classLevel = ob1_1.ob1Inc(parser.state.classLevel);
    const state = { hadConstructor: false };
    const body = [];
    const openContext = parser.expectOpening(types_1.types.braceL, types_1.types.braceR, 'class body');
    while (true) {
        if (parser.match(types_1.types.braceR) || parser.match(types_1.types.eof)) {
            break;
        }
        if (parser.eat(types_1.types.semi)) {
            continue;
        }
        const member = parseClassMember(parser, state);
        if (member !== undefined) {
            body.push(member);
        }
    }
    parser.expectClosing(openContext);
    parser.state.classLevel = ob1_1.ob1Dec(parser.state.classLevel);
    parser.popScope('STRICT');
    return body;
}
function parseClassMember(parser, state) {
    const start = parser.getPosition();
    const escapePosition = parser.state.escapePosition;
    let accessibility;
    if (parser.isSyntaxEnabled('ts')) {
        accessibility = index_1.parseTSAccessModifier(parser);
    }
    let isStatic = false;
    if (parser.match(types_1.types.name) && parser.state.tokenValue === 'static') {
        const keyId = index_1.parseIdentifier(parser, true); // eats 'static'
        const key = {
            type: 'StaticPropertyKey',
            value: keyId,
            loc: keyId.loc,
        };
        const meta = parser.finishNode(start, {
            type: 'ClassPropertyMeta',
            static: false,
            typeAnnotation: undefined,
            accessibility,
            optional: false,
            abstract: false,
            readonly: false,
        });
        if (isClassMethod(parser)) {
            // A method named 'static'
            return parseClassMethod(parser, {
                start,
                meta,
                key,
                kind: 'method',
                isStatic: false,
                isAsync: false,
                isGenerator: false,
                isConstructor: false,
            });
        }
        if (isClassProperty(parser)) {
            // A property named 'static'
            return parseClassProperty(parser, start, key, meta);
        }
        if (escapePosition !== undefined) {
            parser.addDiagnostic({
                index: escapePosition,
                description: diagnostics_1.descriptions.JS_PARSER.ESCAPE_SEQUENCE_IN_WORD('static'),
            });
        }
        // Otherwise something static
        isStatic = true;
    }
    return parseClassMemberWithIsStatic(parser, start, state, isStatic, accessibility);
}
function parseClassMemberWithIsStatic(parser, start, state, isStatic, accessibility) {
    let abstract = false;
    let readonly = false;
    const mod = index_1.parseTSModifier(parser, ['abstract', 'readonly']);
    switch (mod) {
        case 'readonly': {
            readonly = true;
            abstract = index_1.hasTSModifier(parser, ['abstract']);
            break;
        }
        case 'abstract': {
            abstract = true;
            readonly = index_1.hasTSModifier(parser, ['readonly']);
            break;
        }
    }
    const nameOpts = {
        start,
        static: isStatic,
        accessibility,
        readonly,
        abstract,
    };
    if (!abstract && !isStatic && accessibility === undefined) {
        const indexSignature = index_1.tryTSParseIndexSignature(parser, start);
        if (indexSignature) {
            return {
                ...indexSignature,
                readonly,
            };
        }
    }
    // Must be a property (if not an index signature).
    if (readonly) {
        const { key, meta } = parseClassPropertyMeta(parser, nameOpts);
        if (key.value.type === 'PrivateName') {
            return parseClassPrivateProperty(parser, start, key.value, meta);
        }
        else {
            return pushClassProperty(parser, start, key, meta);
        }
    }
    // Generator methods
    if (parser.eat(types_1.types.star)) {
        const { meta, key } = parseClassPropertyMeta(parser, nameOpts);
        if (key.value.type === 'PrivateName') {
            // Private generator method
            return parseClassPrivateMethod(parser, {
                start,
                key: key.value,
                variance: undefined,
                meta,
                isGenerator: true,
                isAsync: false,
                kind: 'method',
            });
        }
        if (isNonstaticConstructor(parser, key, meta)) {
            parser.addDiagnostic({
                loc: key.loc,
                description: diagnostics_1.descriptions.JS_PARSER.GENERATOR_CLASS_CONSTRUCTOR,
            });
        }
        return parseClassMethod(parser, {
            start,
            key,
            meta,
            kind: 'method',
            isStatic: false,
            isGenerator: true,
            isAsync: false,
            isConstructor: false,
        });
    }
    const escapePosition = parser.state.escapePosition;
    const { meta, key } = parseClassPropertyMeta(parser, nameOpts);
    // Regular method
    if (isClassMethod(parser)) {
        // Private method
        if (key.value.type === 'PrivateName') {
            return parseClassPrivateMethod(parser, {
                start,
                key: key.value,
                meta,
                isGenerator: false,
                isAsync: false,
                kind: 'method',
                variance: undefined,
            });
        }
        const isConstructor = isNonstaticConstructor(parser, key, meta);
        let kind = 'method';
        if (isConstructor) {
            kind = 'constructor';
            // TypeScript allows multiple overloaded constructor declarations
            if (state.hadConstructor && !parser.isSyntaxEnabled('ts')) {
                parser.addDiagnostic({
                    loc: key.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.DUPLICATE_CLASS_CONSTRUCTOR,
                });
            }
            state.hadConstructor = true;
        }
        return parseClassMethod(parser, {
            start,
            key,
            meta,
            kind,
            isStatic,
            isGenerator: false,
            isAsync: false,
            isConstructor,
        });
    }
    // Class property
    if (isClassProperty(parser)) {
        if (key.value.type === 'PrivateName') {
            return parseClassPrivateProperty(parser, start, key.value, meta);
        }
        else {
            return pushClassProperty(parser, start, key, meta);
        }
    }
    // Async method
    if (key.value.type === 'Identifier' &&
        key.value.name === 'async' &&
        !parser.isLineTerminator()) {
        parser.banUnicodeEscape(escapePosition, 'async');
        // an async method
        const isGenerator = parser.eat(types_1.types.star);
        // The so-called parsed name would have been "async": get the real name.
        const { meta, key } = parseClassPropertyMeta(parser, nameOpts);
        if (key.value.type === 'PrivateName') {
            // private async method
            return parseClassPrivateMethod(parser, {
                start,
                key: key.value,
                meta,
                isGenerator,
                isAsync: true,
                kind: 'method',
                variance: undefined,
            });
        }
        else {
            const method = parseClassMethod(parser, {
                start,
                key,
                meta,
                kind: 'method',
                isStatic,
                isGenerator,
                isAsync: true,
                isConstructor: false,
            });
            if (isNonstaticConstructor(parser, key, meta)) {
                parser.addDiagnostic({
                    loc: key.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.ASYNC_CLASS_CONSTRUCTOR,
                });
            }
            return method;
        }
    }
    // Getter/setter method
    if (key.value.type === 'Identifier' &&
        (key.value.name === 'get' || key.value.name === 'set') &&
        !(parser.isLineTerminator() && parser.match(types_1.types.star))) {
        // `get\n*` is an uninitialized property named 'get' followed by a generator.
        // a getter or setter
        const kind = key.value.name;
        parser.banUnicodeEscape(escapePosition, kind);
        // The so-called parsed name would have been "get/set": get the real name.
        const { meta, key: methodKey } = parseClassPropertyMeta(parser, nameOpts);
        if (methodKey.value.type === 'PrivateName') {
            // private getter/setter
            const method = parseClassPrivateMethod(parser, {
                start,
                key: methodKey.value,
                meta,
                isGenerator: false,
                isAsync: false,
                kind,
                variance: undefined,
            });
            index_1.checkGetterSetterParamCount(parser, method, method.kind);
            return method;
        }
        else {
            const method = parseClassMethod(parser, {
                start,
                key: methodKey,
                meta,
                kind,
                isStatic: false,
                isGenerator: false,
                isAsync: false,
                isConstructor: false,
            });
            if (isNonstaticConstructor(parser, key, meta)) {
                parser.addDiagnostic({
                    loc: methodKey.loc,
                    description: diagnostics_1.descriptions.JS_PARSER.GET_SET_CLASS_CONSTRUCTOR,
                });
            }
            index_1.checkGetterSetterParamCount(parser, method, method.kind);
            return method;
        }
    }
    if (parser.isLineTerminator()) {
        // an uninitialized class property (due to ASI, since we don't otherwise recognize the next token)
        if (key.value.type === 'PrivateName') {
            return parseClassPrivateProperty(parser, start, key.value, meta);
        }
        else {
            return pushClassProperty(parser, start, key, meta);
        }
    }
    parser.addDiagnostic({
        description: diagnostics_1.descriptions.JS_PARSER.UNKNOWN_CLASS_PROPERTY_START,
    });
    return undefined;
}
function parseClassPropertyMeta(parser, opts) {
    let typeAnnotation;
    if (parser.match(types_1.types.colon)) {
        typeAnnotation = index_1.parsePrimaryTypeAnnotation(parser);
    }
    const key = index_1.parseObjectPropertyKey(parser);
    if (key.type === 'StaticPropertyKey' &&
        opts.static === true &&
        key.value.type === 'Identifier' &&
        key.value.name === 'prototype') {
        parser.addDiagnostic({
            loc: key.loc,
            description: diagnostics_1.descriptions.JS_PARSER.CLASS_STATIC_PROTOTYPE_PROPERTY,
        });
    }
    if (key.value.type === 'PrivateName' && key.value.id.name === 'constructor') {
        parser.addDiagnostic({
            loc: key.loc,
            description: diagnostics_1.descriptions.JS_PARSER.CLASS_PRIVATE_FIELD_NAMED_CONSTRUCTOR,
        });
    }
    let optional = false;
    if (parser.match(types_1.types.question)) {
        optional = true;
        parser.expectSyntaxEnabled('ts');
        parser.next();
    }
    return {
        key,
        meta: parser.finishNode(opts.start, {
            type: 'ClassPropertyMeta',
            typeAnnotation,
            optional,
            ...opts,
        }),
    };
}
function pushClassProperty(parser, start, key, meta) {
    // This only affects properties, not methods.
    if (isNonstaticConstructor(parser, key, meta)) {
        parser.addDiagnostic({
            loc: key.loc,
            description: diagnostics_1.descriptions.JS_PARSER.CLASS_PROPERTY_NAME_CONSTRUCTOR,
        });
    }
    return parseClassProperty(parser, start, key, meta);
}
function parseClassMethod(parser, opts) {
    const { start, key, meta, kind, isGenerator, isAsync, isConstructor } = opts;
    if (key.variance !== undefined) {
        parser.addDiagnostic({
            loc: key.variance.loc,
            description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
        });
    }
    const typeParameters = index_1.maybeParseTypeParameters(parser);
    const { head, body } = index_1.parseMethod(parser, {
        kind,
        isClass: true,
        isGenerator,
        isAsync,
        isConstructor,
    });
    const method = {
        head: {
            ...head,
            typeParameters,
        },
        loc: parser.finishLoc(start),
        kind,
        key,
        meta,
    };
    if (body === undefined) {
        return parser.finalizeNode({
            ...method,
            type: 'TSDeclareMethod',
            body: undefined,
        });
    }
    else {
        if (body.type !== 'BlockStatement') {
            throw new Error('Expected BlockStatement body');
        }
        if (key.value.type === 'PrivateName') {
            throw new Error('Expected to hit other private methods instead');
        }
        return parser.finalizeNode({
            ...method,
            body,
            type: 'ClassMethod',
        });
    }
}
function parseClassPrivateMethod(parser, opts) {
    const { start, key, variance, meta, isGenerator, isAsync, kind } = opts;
    if (variance !== undefined) {
        parser.addDiagnostic({
            loc: variance.loc,
            description: diagnostics_1.descriptions.JS_PARSER.ILLEGAL_VARIANCE,
        });
    }
    const typeParameters = index_1.maybeParseTypeParameters(parser);
    const method = index_1.parseMethod(parser, {
        kind,
        isClass: true,
        isGenerator,
        isAsync,
        isConstructor: false,
    });
    const { body } = method;
    if (body === undefined || body.type !== 'BlockStatement') {
        throw new Error('Expected body');
    }
    return parser.finishNode(start, {
        ...method,
        body,
        meta,
        key,
        kind,
        type: 'ClassPrivateMethod',
        variance,
        head: {
            ...method.head,
            typeParameters,
        },
    });
}
function parseClassPrivateProperty(parser, start, key, meta) {
    parser.pushScope('CLASS_PROPERTY', true);
    let typeAnnotation;
    if (parser.match(types_1.types.colon)) {
        typeAnnotation = index_1.parsePrimaryTypeAnnotation(parser);
    }
    const value = parser.eat(types_1.types.eq)
        ? index_1.parseMaybeAssign(parser, 'class private property value')
        : undefined;
    parser.semicolon();
    parser.popScope('CLASS_PROPERTY');
    return parser.finishNode(start, {
        meta,
        key,
        type: 'ClassPrivateProperty',
        value,
        typeAnnotation,
    });
}
function parseClassProperty(parser, start, key, meta) {
    // TODO maybe parsing should be abstracted for private class properties too?
    let definite;
    if (!meta.optional && parser.eat(types_1.types.bang)) {
        definite = true;
        parser.expectSyntaxEnabled('ts');
    }
    let typeAnnotation;
    if (parser.match(types_1.types.colon)) {
        typeAnnotation = index_1.parsePrimaryTypeAnnotation(parser);
    }
    parser.pushScope('CLASS_PROPERTY', true);
    let value;
    if (parser.match(types_1.types.eq)) {
        parser.next();
        value = index_1.parseMaybeAssign(parser, 'class property value');
    }
    parser.semicolon();
    parser.popScope('CLASS_PROPERTY');
    if (key.value.type === 'PrivateName') {
        throw new Error('PrivateName encountered in regular parseClassProperty, expects method is parsePrivateClassProperty');
    }
    return parser.finishNode(start, {
        meta,
        key,
        type: 'ClassProperty',
        definite,
        typeAnnotation,
        value,
    });
}
function parseClassId(parser, optionalId) {
    let idAllowed = true;
    // Allow `class implements Foo {}` in class expressions
    if (optionalId === true && parser.isContextual('implements')) {
        idAllowed = false;
    }
    let id;
    if (idAllowed) {
        if (parser.match(types_1.types.name)) {
            id = expression_1.parseBindingIdentifier(parser);
        }
        else if (!optionalId) {
            parser.addDiagnostic({
                description: diagnostics_1.descriptions.JS_PARSER.REQUIRED_CLASS_NAME,
            });
            id = expression_1.toBindingIdentifier(parser, parser.createUnknownIdentifier('required class name'));
        }
    }
    const typeParameters = index_1.maybeParseTypeParameters(parser, true);
    return { id, typeParameters };
}
function parseClassSuper(parser) {
    let superClass = parser.eat(types_1.types._extends)
        ? index_1.parseExpressionWithPossibleSubscripts(parser, 'class heritage')
        : undefined;
    let superTypeParameters;
    if (superClass !== undefined) {
        superTypeParameters = index_1.maybeParseTypeArguments(parser);
    }
    let implemented;
    if (parser.isContextual('implements')) {
        parser.next();
        implemented = index_1.parseClassImplements(parser);
    }
    return { superClass, superTypeParameters, implemented };
}
