"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const diagnostics_1 = require("@romejs/diagnostics");
function transformClass(node, path, context) {
    const { scope } = path;
    // declarations that we want to append and prepend, these include inheritance setup, method assignment, and other declarations
    const prependDeclarations = [];
    const declarations = [];
    // if the superClass is a global variable or a complex expression, then we should execute it once before the function is evaluated to ensure correct execution semantics
    let superClassRef;
    const { superClass } = node.meta;
    if (superClass !== undefined) {
        if (superClass.type === 'ReferenceIdentifier' &&
            scope.hasBinding(superClass.name)) {
            superClassRef = superClass;
        }
        else {
            superClassRef = js_ast_1.referenceIdentifier.create({
                name: scope.generateUid('superClass'),
            });
            prependDeclarations.push(js_ast_utils_1.template.statement `const ${superClassRef} = ${superClass};`);
        }
    }
    // get the class name, if there's no class id then generate a new name
    const className = node.id === undefined ? scope.generateUid('class') : node.id.name;
    // push on the superClass setup
    if (superClass !== undefined) {
        if (superClassRef === undefined) {
            throw new Error('Impossible');
        }
        // inherit static properties
        // technically this isn't correct, the fully spec compliant version is Object.setPrototypeOf(Class, SuperClass);
        declarations.push(js_ast_utils_1.template.statement `Object.assign(${className}, ${superClassRef});`);
        // inherit prototype
        declarations.push(js_ast_utils_1.template.statement `${className}.prototype = Object.create(${superClassRef} && ${superClassRef}.prototype);`);
        // set correct prototype.constructor
        declarations.push(js_ast_utils_1.template.statement `${className}.prototype.constructor = ${className};`);
        // some weird property the old babel transform apparently adds, TODO: check the actual usage of this
        declarations.push(js_ast_utils_1.template.statement `${className}.__superConstructor__ = ${superClassRef};`);
    }
    const newNode = js_ast_1.classDeclaration.assert(path.reduce({
        name: 'classesSuperTransform',
        enter(path) {
            if (superClassRef === undefined) {
                throw new Error('Impossible');
            }
            const { node } = path;
            // TODO correctly support super() by using return value
            if (node.type === 'CallExpression' && node.callee.type === 'Super') {
                // replace super(...args); with Super.call(this, ...args);
                return js_ast_1.callExpression.create({
                    callee: js_ast_1.memberExpression.create({
                        object: superClassRef,
                        property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick('call')),
                    }),
                    arguments: [js_ast_1.thisExpression.create({}), ...node.arguments],
                });
            }
            // TODO super.foo
            if (node.type === 'MemberExpression' && node.object.type === 'Super') {
                const classMethod2 = path.findAncestry((path) => path.node.type === 'ClassMethod');
                if (classMethod2 === undefined) {
                    throw new Error('Expected to find class method here');
                }
                const isStatic = js_ast_1.classMethod.assert(classMethod2.node).meta.static === true;
                const { property } = node;
                if (isStatic) {
                    return js_ast_1.memberExpression.create({
                        object: superClassRef,
                        property,
                    });
                }
                const superProtoRef = js_ast_1.memberExpression.create({
                    object: superClassRef,
                    property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick('prototype')),
                });
                return js_ast_1.memberExpression.create({
                    object: superProtoRef,
                    property,
                });
            }
            // super.foo();
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Super') {
                const classMethod2 = path.findAncestry((path) => path.node.type === 'ClassMethod');
                if (classMethod2 === undefined) {
                    throw new Error('Expected to find class method here');
                }
                const isStatic = js_ast_1.classMethod.assert(classMethod2.node).meta.static === true;
                const args = node.arguments;
                const { property } = node.callee;
                // for static methods replace `super.foo(...args);` with `Super.foo.call(Class, ...args);`
                if (isStatic) {
                    let methodRef;
                    methodRef = js_ast_1.memberExpression.create({
                        object: superClassRef,
                        property,
                    });
                    return js_ast_1.callExpression.create({
                        callee: js_ast_1.memberExpression.create({
                            object: methodRef,
                            property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick('call')),
                        }),
                        arguments: [js_ast_1.referenceIdentifier.quick(className), ...args],
                    });
                }
                // for instance methods replace `super.foo(...args)` with `Super.prototype.call(this, ...args)`
                let methodRef;
                let prototypeRef = js_ast_1.memberExpression.create({
                    object: superClassRef,
                    property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick('prototype')),
                });
                methodRef = js_ast_1.memberExpression.create({
                    object: prototypeRef,
                    property,
                });
                return js_ast_1.callExpression.create({
                    callee: js_ast_1.memberExpression.create({
                        object: methodRef,
                        property: js_ast_1.staticMemberProperty.quick(js_ast_1.identifier.quick('call')),
                    }),
                    arguments: [js_ast_1.thisExpression.create({}), ...args],
                });
            }
            // TODO break when inside of functions
            return node;
        },
    }));
    // setup method declarations
    let constructorMethod = undefined;
    for (const bodyNode of newNode.meta.body) {
        if (bodyNode.type !== 'ClassMethod') {
            context.addNodeDiagnostic(bodyNode, diagnostics_1.descriptions.COMPILER.CLASSES_UNSUPPORTED);
            continue;
        }
        // save the constructor if this is it, we'll process this later
        if (bodyNode.kind === 'constructor') {
            constructorMethod = bodyNode;
        }
        if (bodyNode.kind === 'method') {
            // create the function expression to represent this method
            const functionNode = js_ast_1.functionExpression.create({
                head: bodyNode.head,
                body: bodyNode.body,
            });
            // create the target node, for static methods this will be the base class, otherwise it's the prototype
            let target;
            if (bodyNode.meta.static === true) {
                target = js_ast_1.identifier.quick(className);
            }
            else {
                target = js_ast_utils_1.template.expression `${className}.prototype`;
            }
            // use computed properties for computed methods
            if (bodyNode.key.type === 'ComputedPropertyKey') {
                declarations.push(js_ast_utils_1.template.statement `${target}[${bodyNode.key.value}] = ${functionNode}`);
            }
            else {
                declarations.push(js_ast_utils_1.template.statement `${target}.${bodyNode.key.value} = ${functionNode}`);
            }
        }
    }
    // create the constructor method
    let _constructor;
    if (constructorMethod === undefined) {
        if (superClassRef === undefined) {
            _constructor = js_ast_1.functionDeclaration.assert(js_ast_utils_1.template.statement `function ${className}() {}`);
        }
        else {
            _constructor = js_ast_1.functionDeclaration.assert(js_ast_utils_1.template.statement `function ${className}(...args) {${superClassRef}.apply(this, args);}`);
        }
    }
    else {
        _constructor = js_ast_1.functionDeclaration.create({
            id: js_ast_1.bindingIdentifier.quick(className),
            head: constructorMethod.head,
            body: constructorMethod.body,
        });
    }
    return { _constructor, prependDeclarations, declarations };
}
exports.default = {
    name: 'classes',
    enter(path) {
        const { node, scope, context } = path;
        // correctly replace an export class with the class node then append the declarations
        if ((node.type === 'ExportLocalDeclaration' ||
            node.type === 'ExportDefaultDeclaration') &&
            node.declaration !== undefined &&
            node.declaration.type === 'ClassDeclaration') {
            const { _constructor, declarations, prependDeclarations } = transformClass(node.declaration, path.getChildPath('declaration'), context);
            const nodes = [
                ...prependDeclarations,
                {
                    ...node,
                    declaration: _constructor,
                },
                ...declarations,
            ];
            return nodes;
        }
        if (node.type === 'ClassDeclaration') {
            const { _constructor, prependDeclarations, declarations } = transformClass(node, path, context);
            return [...prependDeclarations, _constructor, ...declarations];
        }
        // turn a class expression into an IIFE that returns a class declaration
        if (node.type === 'ClassExpression') {
            const className = node.id === undefined ? scope.generateUid('class') : node.id.name;
            return js_ast_1.callExpression.create({
                callee: js_ast_1.arrowFunctionExpression.create({
                    head: js_ast_1.functionHead.quick([]),
                    body: js_ast_1.blockStatement.create({
                        body: [
                            {
                                ...node,
                                type: 'ClassDeclaration',
                                id: js_ast_1.bindingIdentifier.quick(className),
                            },
                            js_ast_1.returnStatement.create({
                                argument: js_ast_1.referenceIdentifier.quick(className),
                            }),
                        ],
                    }),
                }),
                arguments: [],
            });
        }
        return node;
    },
};
