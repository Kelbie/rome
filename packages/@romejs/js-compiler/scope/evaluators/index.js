"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ClassDeclaration_1 = require("./ClassDeclaration");
const FunctionDeclaration_1 = require("./FunctionDeclaration");
const VariableDeclaration_1 = require("./VariableDeclaration");
const TypeAliasTypeAnnotation_1 = require("./TypeAliasTypeAnnotation");
const ExportDefaultDeclaration_1 = require("./ExportDefaultDeclaration");
const ExportLocalDeclaration_1 = require("./ExportLocalDeclaration");
const ImportDeclaration_1 = require("./ImportDeclaration");
const FlowTypeParameterDeclaration_1 = require("./FlowTypeParameterDeclaration");
const FlowDeclareExportNamed_1 = require("./FlowDeclareExportNamed");
const SwitchCase_1 = require("./SwitchCase");
const SwitchStatement_1 = require("./SwitchStatement");
const FlowInterfaceDeclaration_1 = require("./FlowInterfaceDeclaration");
const FlowOpaqueType_1 = require("./FlowOpaqueType");
const FlowDeclareOpaqueType_1 = require("./FlowDeclareOpaqueType");
const FlowDeclareFunction_1 = require("./FlowDeclareFunction");
const FlowDeclareClass_1 = require("./FlowDeclareClass");
const TSImportEqualsDeclaration_1 = require("./TSImportEqualsDeclaration");
const ArrowFunctionExpression_1 = require("./ArrowFunctionExpression");
const BlockStatement_1 = require("./BlockStatement");
const ClassExpression_1 = require("./ClassExpression");
const CatchClause_1 = require("./CatchClause");
const Program_1 = require("./Program");
const ForStatement_1 = require("./ForStatement");
const ForOfStatement_1 = require("./ForOfStatement");
const VariableDeclarationStatement_1 = require("./VariableDeclarationStatement");
const TSInterfaceDeclaration_1 = require("./TSInterfaceDeclaration");
const TSDeclareFunction_1 = require("./TSDeclareFunction");
const FunctionHead_1 = require("./FunctionHead");
const evaluators = new Map();
evaluators.set('FunctionHead', FunctionHead_1.default);
evaluators.set('TSDeclareFunction', TSDeclareFunction_1.default);
evaluators.set('ClassDeclaration', ClassDeclaration_1.default);
evaluators.set('FunctionDeclaration', FunctionDeclaration_1.default);
evaluators.set('VariableDeclarationStatement', VariableDeclarationStatement_1.default);
evaluators.set('VariableDeclaration', VariableDeclaration_1.default);
evaluators.set('TypeAliasTypeAnnotation', TypeAliasTypeAnnotation_1.default);
evaluators.set('ExportDefaultDeclaration', ExportDefaultDeclaration_1.default);
evaluators.set('ExportLocalDeclaration', ExportLocalDeclaration_1.default);
evaluators.set('ImportDeclaration', ImportDeclaration_1.default);
evaluators.set('FlowTypeParameterDeclaration', FlowTypeParameterDeclaration_1.default);
evaluators.set('FlowDeclareExportNamed', FlowDeclareExportNamed_1.default);
evaluators.set('SwitchCase', SwitchCase_1.default);
evaluators.set('SwitchStatement', SwitchStatement_1.default);
evaluators.set('FlowInterfaceDeclaration', FlowInterfaceDeclaration_1.default);
evaluators.set('FlowOpaqueType', FlowOpaqueType_1.default);
evaluators.set('FlowDeclareOpaqueType', FlowDeclareOpaqueType_1.default);
evaluators.set('FlowDeclareFunction', FlowDeclareFunction_1.default);
evaluators.set('FlowDeclareClass', FlowDeclareClass_1.default);
evaluators.set('TypeAliasTypeAnnotation', TypeAliasTypeAnnotation_1.default);
evaluators.set('TSImportEqualsDeclaration', TSImportEqualsDeclaration_1.default);
evaluators.set('ArrowFunctionExpression', ArrowFunctionExpression_1.default);
evaluators.set('BlockStatement', BlockStatement_1.default);
evaluators.set('ClassExpression', ClassExpression_1.default);
evaluators.set('CatchClause', CatchClause_1.default);
evaluators.set('Program', Program_1.default);
evaluators.set('ForStatement', ForStatement_1.default);
evaluators.set('ForOfStatement', ForOfStatement_1.default);
evaluators.set('ForInStatement', ForOfStatement_1.default);
evaluators.set('TSInterfaceDeclaration', TSInterfaceDeclaration_1.default);
exports.default = evaluators;
