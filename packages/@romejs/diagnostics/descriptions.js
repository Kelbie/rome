"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const string_markup_1 = require("@romejs/string-markup");
const string_diff_1 = require("@romejs/string-diff");
const helpers_1 = require("./helpers");
const string_utils_1 = require("@romejs/string-utils");
// The purpose of this is so that we're explicit whenever we want to create a diagnostic message outside of this file
function createBlessedDiagnosticMessage(value) {
    return {
        type: 'PARTIAL_BLESSED_DIAGNOSTIC_MESSAGE',
        value,
    };
}
exports.createBlessedDiagnosticMessage = createBlessedDiagnosticMessage;
function join(conjunction, items) {
    if (items.length === 0) {
        return '';
    }
    else if (items.length === 1) {
        return items[0];
    }
    else {
        return [...items, `${conjunction} ${items.pop()}`].join(', ');
    }
}
function andJoin(items) {
    return join('and', items);
}
andJoin;
function orJoin(items) {
    return join('or', items);
}
function addEmphasis(items) {
    return items.map((item) => `<emphasis>${item}</emphasis>`);
}
// This is a lot of gross meta programming
function createMessages(messages) {
    // rome-ignore lint/noExplicitAny
    const out = {};
    for (const categoryName in messages) {
        // rome-ignore lint/noExplicitAny
        const category = {};
        out[categoryName] = category;
        const inputCategory = messages[categoryName];
        for (const key in inputCategory) {
            const value = inputCategory[key];
            if (typeof value === 'string') {
                category[key] = {
                    advice: [],
                    message: createBlessedDiagnosticMessage(value),
                };
            }
            else if (typeof value === 'function') {
                // rome-ignore lint/noExplicitAny
                const callback = value;
                category[key] = function (...params) {
                    const { message, ...ret } = callback(...params);
                    return {
                        advice: [],
                        ...ret,
                        message: createBlessedDiagnosticMessage(message),
                    };
                };
            }
            else {
                // rome-ignore lint/noExplicitAny
                const { message, ...obj } = value;
                category[key] = {
                    advice: [],
                    ...obj,
                    message: createBlessedDiagnosticMessage(message),
                };
            }
        }
    }
    return out;
}
function buildJSXOpeningAdvice(name, openingLoc) {
    return [
        {
            type: 'log',
            category: 'info',
            text: name === ''
                ? 'Originated from this opening tag'
                : `Originated from opening tag of <emphasis>${name}</emphasis>`,
        },
        {
            type: 'frame',
            location: openingLoc,
        },
    ];
}
exports.descriptions = createMessages({
    FLAGS: {
        UNSUPPORTED_SHORTHANDS: `Shorthand flags are not supported`,
        INCORRECT_CASED_FLAG: (flag) => ({
            message: `Incorrect cased flag name`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `Use <emphasis>${string_utils_1.toKebabCase(flag)}</emphasis> instead`,
                },
            ],
        }),
        INCORRECT_ARG_COUNT: (excessive, message) => ({
            message: excessive ? 'Too many arguments' : 'Missing arguments',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: message,
                },
            ],
        }),
        DISALLOWED_REVIEW_FLAG: (key) => ({
            message: `Flag <emphasis>${key}</emphasis> is not allowed with <emphasis>review</emphasis>`,
        }),
        DISALLOWED_REQUEST_FLAG: (key) => ({
            message: `This command does not support the <emphasis>${key}</emphasis> flag`,
        }),
        UNKNOWN_ACTION: (action) => ({
            message: `Unknown action ${action}`,
        }),
        NO_FILES_FOUND: (noun) => ({
            message: noun === undefined
                ? 'No files found'
                : `No files to ${noun} found`,
        }),
    },
    // @romejs/parser-core
    PARSER_CORE: {
        EXPECTED_SPACE: 'Expected no space between',
        EXPECTED_EOF: 'Expected end of file',
        UNEXPECTED_EOF: 'Unexpected end of file',
        UNEXPECTED: (type) => ({
            message: string_markup_1.markup `Unexpected ${type}`,
        }),
        UNEXPECTED_CHARACTER: (char) => ({
            message: string_markup_1.markup `Unexpected character <emphasis>${char}</emphasis>`,
        }),
        EXPECTED_TOKEN: (got, expected) => {
            return {
                message: string_markup_1.markup `Expected token ${expected} but got ${got}`,
            };
        },
    },
    // @romejs/codec-js-regexp
    REGEX_PARSER: {
        INVALID_CAPTURE_GROUP_MODIFIER: 'Invalid capture group modifier',
        UNCLOSED_GROUP: 'Unclosed group',
        UNOPENED_GROUP: 'Unopened group',
        INVALID_QUANTIFIER_TARGET: 'Invalid target for quantifier',
        UNKNOWN_REGEX_PART: 'Unknown regex part',
        REVERSED_CHAR_SET_RANGE: 'Range values reversed. Start char code is greater than end char code',
        UNCLOSED_CHAR_SET: 'Unclosed character set',
        DUPLICATE_FLAG: 'Duplicate regular expression flag',
        INVALID_FLAG: 'Invalid regular expression flag',
        REVERSED_QUANTIFIER_RANGE: 'Quantifier minimum is greater than maximum',
        NO_TARGET_QUANTIFIER: 'Nothing to repeat',
        INVALID_NAMED_CAPTURE: 'Invalid named capture referenced',
        UNCLOSED_NAMED_CAPTURE: 'Unclosed named capture',
    },
    // @romejs/codec-json
    JSON: {
        SINGLE_QUOTE_USAGE: 'You can only use double quoted strings',
        TRAILING_COMMA_VALUE: 'Trailing comma is only allowed after a value',
        UNCLOSED_STRING: 'Unclosed string',
        UNCLOSED_BLOCK_COMMENT: 'Unclosed block comment',
        MISTAKEN_ARRAY_IDENTITY: 'Trying to use an array element as an object property. Did you mean to make an object?',
        REDUNDANT_COMMA: 'Redundant comma',
        EMPTY_INPUT_IN_JSON: 'Empty input',
        PROPERTY_KEY_UNQUOTED_IN_JSON: 'Property keys must be quoted in JSON',
        IMPLICIT_OBJECT_IN_JSON: 'Objects must be wrapped in curly braces in JSON',
        COMMENTS_IN_JSON: "Comments aren't allowed in JSON",
        TRAILING_COMMA_IN_JSON: "Trailing commas aren't allowed in JSON",
        REGEX_IN_JSON: "Regular expressions aren't allowed in JSON",
        UNKNOWN_WORD_IN_JSON: (word) => ({
            message: string_markup_1.markup `${word} isn't a valid JSON word`,
        }),
        STRING_NEWLINES_IN_JSON: "Newlines aren't allowed in JSON, you insert a newline by escaping it like this \"\\n\"",
        UNDEFINED_IN_JSON: "undefined isn't allowed in JSON, you could use null instead",
        BIGINT_IN_JSON: "Bigints aren't allowed in JSON",
        NUMERIC_SEPARATORS_IN_JSON: 'Numeric separators are not allowed in JSON',
    },
    // @romejs/codec-semver
    SEMVER: {
        MISSING_MINOR_VERSION: 'A minor number is required for a version',
        MISSING_PATCH_VERSION: 'A patch number is required for a version',
        EXCESSIVE_VERSION_PARTS: 'Too many parts for version',
        INVALID_QUANTIFIER_PART: 'Invalid version qualifier part',
        WILDCARD_IN_VERSION: "Wildcard aren't allowed in a hard version",
        INVALID_VERSION_NUMBER: "This isn't a valid version part, expected a number",
        INVALID_RANGE: 'A semver range can only be defined with versions',
        BARE_PIPE_WITHOUT_LOOSE: 'Bare pipes are only allowed in loose mode',
        UNEXPECTED_WORD: (word) => ({
            message: string_markup_1.markup `Unexpected word <emphasis>${word}</emphasis>`,
        }),
        UNKNOWN_START: 'Unknown start of atom',
        EXPECTED_VERSION: 'Unexpected value for version',
    },
    V8: {
        SYNTAX_ERROR: (message) => ({ message, category: 'v8/syntaxError' }),
    },
    // @romejs/core/master/commands/lint.ts
    LINT_COMMAND: {
        INVALID_DECISION_ACTION: (action) => ({
            message: string_markup_1.markup `<emphasis>${action}</emphasis> is not a valid decision action`,
        }),
        INVALID_DECISION_PART_COUNT: (i) => ({
            message: `Segment ${i} contains an invalid number of decision parts`,
        }),
    },
    // @romejs/js-compiler
    LINT: {
        IMPORT_DEFAULT_BASENAME: (prev, basename) => ({
            category: 'lint/importDefaultBasename',
            message: string_markup_1.markup `When importing the default, use the basename <emphasis>${basename}</emphasis>`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'If you really meant this then use this instead',
                },
                {
                    type: 'code',
                    code: string_markup_1.markup `import {default as ${prev}}`,
                },
            ],
        }),
        NO_COMMA_OPERATOR: {
            category: 'lint/noCommaOperator',
            message: 'Avoid usage of the comma operator. It can lead to easy mistakes and ambiguous code.',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'If you want multiple expressions then break it up.',
                },
            ],
        },
        NEGATION_ELSE: {
            category: 'lint/negationElse',
            message: 'Invert the blocks when you have a negation test',
        },
        STYLE_PROP_OBJECT: {
            category: 'lint/stylePropObject',
            message: '<emphasis>style</emphasis> property value must be an object.',
        },
        PENDING_FIXES: (relativeFilename, original, formatted) => ({
            category: 'lint/pendingFixes',
            message: 'Pending formatting and recommended autofixes',
            advice: [
                {
                    type: 'diff',
                    diff: string_diff_1.default(original, formatted),
                },
                {
                    type: 'action',
                    command: 'lint',
                    shortcut: 'f',
                    instruction: 'To apply fixes and formatting run',
                    noun: 'Apply fixes and format',
                    args: [relativeFilename],
                    commandFlags: {
                        save: true,
                    },
                },
                {
                    type: 'action',
                    hidden: true,
                    command: 'lint',
                    shortcut: 'o',
                    instruction: 'To format this file without any fixes run',
                    noun: 'Only format',
                    args: [relativeFilename],
                    commandFlags: {
                        format: true,
                    },
                },
            ],
        }),
        DUPLICATE_IMPORT_SOURCE: (seenLocation) => ({
            category: 'lint/duplicateImportSource',
            message: 'This module has already been imported',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Previously imported here',
                },
                {
                    type: 'frame',
                    location: seenLocation,
                },
            ],
        }),
        NO_CHILDREN_PROP: {
            category: 'lint/noChildrenProp',
            message: 'children should not be passed as a prop',
        },
        PREFER_BLOCK_STATEMENT: {
            category: 'lint/preferBlockStatements',
            message: 'Block statements are preferred in this position',
        },
        PREFER_TEMPLATE: {
            category: 'lint/preferTemplate',
            message: 'Template literals are preferred over string concatenation',
        },
        PREFER_WHILE: {
            category: 'lint/preferWhile',
            message: 'A while loop should be used over a for loop',
        },
        REACT_JSX_NO_COMMENT_TEXT: {
            category: 'lint/jsxNoCommentText',
            message: 'Comments inside children should be placed in braces',
        },
        REACT_JSX_KEY: (origin) => ({
            category: 'lint/jsxKey',
            message: string_markup_1.markup `Missing the "key" prop for element in ${origin}`,
        }),
        UNSAFE_NEGATION: {
            category: 'lint/unsafeNegation',
            message: 'Unsafe usage of negation operator in left side of binary expression',
        },
        UNUSED_VARIABLES: (kind, name) => ({
            category: 'lint/unusedVariables',
            message: string_markup_1.markup `Unused ${kind} <emphasis>${name}</emphasis>`,
        }),
        UNDECLARED_VARIABLES: (name) => ({
            category: 'lint/undeclaredVariables',
            message: string_markup_1.markup `Undeclared variable <emphasis>${name}</emphasis>`,
        }),
        VARIABLE_CAMEL_CASE: (name, camelCaseName) => ({
            category: 'lint/camelCase',
            message: string_markup_1.markup `Variable <emphasis>${name}</emphasis> should be camel cased as <emphasis>${camelCaseName}</emphasis>`,
        }),
        IDENTIFIER_CAMEL_CASE: (name, camelCaseName) => ({
            category: 'lint/camelCase',
            message: string_markup_1.markup `Identifier <emphasis>${name}</emphasis> should be camel cased as <emphasis>${camelCaseName}</emphasis>`,
        }),
        CASE_SINGLE_STATEMENT: {
            category: 'lint/caseSingleStatement',
            message: 'A switch case should only have a single statement. If you want more then wrap it in a block.',
        },
        INCONSIDERATE_LANGUAGE: (description, word, suggestion) => ({
            category: 'lint/inconsiderateLanguage',
            message: description,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `Instead of <emphasis>${word}</emphasis> use <emphasis>${suggestion}</emphasis>`,
                },
            ],
        }),
        DOUBLE_EQUALS: {
            category: 'lint/doubleEquals',
            message: 'Use === instead of ==',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: '== is only allowed when comparing against null',
                },
            ],
        },
        EMPTY_MATCHES: {
            category: 'lint/emptyMatches',
            message: 'The expression can return empty matches, and may match infinitely in some use cases',
        },
        NEGATE_DOUBLE_EQUALS: {
            category: 'lint/doubleEquals',
            message: 'Use !== instead of !=',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: '!= is only allowed when comparing against null',
                },
            ],
        },
        NO_CATCH_ASSIGN: {
            category: 'lint/noCatchAssign',
            message: "Don't reassign catch parameters",
        },
        SPARSE_ARRAY: {
            category: 'lint/sparseArray',
            message: 'Your array contains an empty slot',
        },
        SINGLE_VAR_DECLARATOR: {
            category: 'lint/singleVarDeclarator',
            message: 'Declare each variable separately',
        },
        PREFER_FUNCTION_DECLARATIONS: {
            category: 'lint/preferFunctionDeclarations',
            message: 'Use a function declaration instead of a const function',
        },
        NO_VAR: {
            category: 'lint/noVar',
            message: 'Variable declarations using `var` are disallowed, use `let` or `const` instead.',
        },
        NO_SHORTHAND_ARRAY_TYPE: {
            category: 'lint/noShorthandArrayType',
            message: string_markup_1.escapeMarkup('Use Array<T> instead of shorthand T[]'),
        },
        NO_UNSAFE_FINALLY: (type) => ({
            category: 'lint/noUnsafeFinally',
            message: string_markup_1.markup `Unsafe usage of ${type}.`,
        }),
        NO_TEMPLATE_CURLY_IN_STRING: {
            category: 'lint/noTemplateCurlyInString',
            message: `Unexpected template string expression.`,
        },
        NO_SHADOW_RESTRICTED_NAMES: (name) => ({
            category: 'lint/noShadowRestrictedNames',
            message: string_markup_1.markup `Shadowing of global property <emphasis>${name}</emphasis>`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: "Consider renaming this variable. It's easy to confuse the origin of variables when they're named after a known global.",
                },
            ],
        }),
        NO_MULTIPLE_SPACES_IN_REGEX_LITERAL: (count) => ({
            category: 'lint/noMultipleSpacesInRegularExpressionLiterals',
            message: 'Unclear multiple spaces in regular expression',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: `It's hard to visually count the amount of spaces, it's clearer if you use a quantifier instead. eg / {${String(count)}}/`,
                },
            ],
        }),
        NO_LABEL_VAR: {
            category: 'lint/noLabelVar',
            message: 'Labels should not be variable names',
        },
        NO_IMPORT_ASSIGN: (name) => ({
            category: 'lint/noImportAssign',
            message: string_markup_1.markup `<emphasis>${name}</emphasis> is read-only`,
        }),
        NO_EXTRA_BOOLEAN_CAST: {
            category: 'lint/noExtraBooleanCast',
            message: `Redundant double negation.`,
        },
        NO_FUNCTION_ASSIGN: {
            category: 'lint/noFunctionAssign',
            message: 'Reassignment of function declaration',
        },
        NO_EXPLICIT_ANY: {
            category: 'lint/noExplicitAny',
            message: 'Unexpected any. Specify a different type.',
        },
        NO_EMPTY_CHAR_SET: {
            category: 'lint/noEmptyCharacterClass',
            message: 'Empty character classes in regular expressions are not allowed',
        },
        NO_DUPLICATE_KEYS: (key) => ({
            category: 'lint/noDuplicateKeys',
            message: string_markup_1.markup `Duplicate key <emphasis>${key}</emphasis>`,
        }),
        NO_POSIX_IN_REGULAR_EXPRESSION: {
            category: 'lint/noPosixInRegularExpression',
            message: 'POSIX Character Classes and Collating Sequences are not supported in ECMAscript Regular Expressions',
        },
        NO_DUPLICATE_CASE: (value) => ({
            category: 'lint/noDuplicateCase',
            message: string_markup_1.markup `Duplicate case <emphasis>${value}</emphasis> not allowed.`,
        }),
        NO_DUPE_ARGS: (name) => ({
            category: 'lint/noDupeArgs',
            message: string_markup_1.markup `Duplicate argument <emphasis>${name}</emphasis> in function definition`,
        }),
        NO_DELETE: {
            category: 'lint/noDelete',
            message: `Unexpected 'delete' operator.`,
        },
        NO_DELETE_VARS: {
            category: 'lint/noDeleteVars',
            message: 'Variables should not be deleted.',
        },
        NO_DEBUGGER: {
            category: 'lint/noDebugger',
            message: "Unexpected 'debugger' statement",
        },
        NO_COND_ASSIGN: {
            category: 'lint/noCondAssign',
            message: 'Cannot assign variable in loop condition',
        },
        NO_COMPARE_NEG_ZERO: (op) => ({
            category: 'lint/noCompareNegZero',
            message: `Do not use the '${op}' operator to compare against -0`,
            fixable: op === '===',
        }),
        NO_ASYNC_PROMISE_EXECUTOR: {
            category: 'lint/noAsyncPromiseExecutor',
            message: 'Promise executor functions should not be async.',
        },
        GETTER_RETURN: (got) => ({
            category: 'lint/getterReturn',
            message: `Expected a 'return' at end of a getter method but got ${got}`,
        }),
        NO_SETTER_RETURN: {
            category: 'lint/noSetterReturn',
            message: `Setter cannot return a value`,
        },
        EMPTY_BLOCKS: {
            category: 'lint/emptyBlocks',
            message: 'Empty block',
        },
        NO_ARGUMENTS: {
            category: 'lint/noArguments',
            message: "Use the rest parameters instead of 'arguments'",
        },
        DUPLICATE_REGEX_GROUP_NAME: (name) => ({
            category: 'lint/noDuplicateGroupNamesInRegularExpressions',
            message: `Duplicate group name <emphasis>${name}</emphasis> in regular expression`,
        }),
        NO_REFERENCE_TO_NON_EXISTING_GROUP: (name) => ({
            category: 'lint/noReferenceToNonExistingGroup',
            message: `Reference to non-existent group <emphasis>"${name}"</emphasis>`,
        }),
        DEFAULT_EXPORT_SAME_BASENAME: ({ defaultName, defaultType, actualFilename, correctFilename, }) => {
            let adviceMessage = '';
            if (defaultName === '*default*') {
                adviceMessage += 'The';
            }
            else {
                adviceMessage += `Filename should be <emphasis>${correctFilename}</emphasis> or the`;
            }
            adviceMessage += ` ${defaultType} name should be <emphasis>${actualFilename}</emphasis>`;
            return {
                category: 'lint/defaultExportSameBasename',
                message: `Filename and the name of a default ${defaultType} should match`,
                advice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: adviceMessage,
                    },
                ],
            };
        },
        RESTRICTED_GLOBALS: (globalName) => ({
            category: 'lint/restrictedGlobals',
            message: string_markup_1.markup `The use of the existing global variable <emphasis>${globalName}</emphasis> is not allowed. Use local variable instead.`,
        }),
        SORT_EXPORT_SPECIFIERS: {
            category: 'lint/sortImportExportSpecifiers',
            message: `Specifiers of the export declaration should be sorted alphabetically.`,
        },
        SORT_IMPORT_SPECIFIERS: {
            category: 'lint/sortImportExportSpecifiers',
            message: `Specifiers of the import declaration should be sorted alphabetically.`,
        },
    },
    PROJECT_MANAGER: {
        NO_VCS: (rootConfigLocation) => ({
            category: 'projectManager/vscMissing',
            message: "Can't find any version control for this project",
            advice: rootConfigLocation === undefined
                ? [
                    {
                        type: 'log',
                        category: 'info',
                        text: 'Version control root was set to the project root as it was not configured. To configure a different folder run',
                    },
                    {
                        type: 'command',
                        command: 'rome config set-directory vcs.root DIRECTORY_HERE',
                    },
                ]
                : [
                    {
                        type: 'log',
                        category: 'info',
                        text: 'Version control root was set here',
                    },
                    {
                        type: 'frame',
                        location: rootConfigLocation,
                    },
                ],
        }),
        DUPLICATE_PACKAGE: (packageName, existing) => ({
            category: 'projectManager/nameCollision',
            message: `Duplicate package name <emphasis>${packageName}</emphasis>`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `Defined already by <filelink target="${existing}" />`,
                },
            ],
        }),
        NOT_FOUND: {
            category: 'projectManager/missing',
            message: `Couldn't find a project`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Run <command>rome init</command> in this folder to initialize a project',
                },
            ],
        },
        INCORRECT_CONFIG_FILENAME: (validFilenames) => ({
            category: 'projectManager/incorrectConfigFilename',
            message: string_markup_1.markup `Invalid rome config filename, <emphasis>${validFilenames.join(' or ')}</emphasis> are the only valid filename`,
        }),
    },
    FORMAT: {
        DISABLED: {
            category: 'format/disabled',
            message: 'Format is disabled for this project',
        },
    },
    // @romejs/js-compiler
    COMPILER: {
        CLASSES_UNSUPPORTED: {
            category: 'compile/classes',
            message: "The classes transform doesn't know how to transform this",
        },
        JSX_NOT_XML: {
            category: 'compile/jsx',
            message: 'JSX is not XML',
        },
    },
    // @romejs/string-escape
    STRING_ESCAPE: {
        NOT_ENOUGH_CODE_POINTS: 'Not enough code point digits',
        INVALID_STRING_CHARACTER: 'Invalid string character (U+0000 to U+001F)',
        INVALID_HEX_DIGIT_FOR_ESCAPE: 'Invalid hex digit for unicode escape',
    },
    ANALYZE_DEPENDENCIES: {
        CJS_EXPORT_IN_ES: {
            category: 'analyzeDependencies/cjsExportInES',
            message: 'You cannot use CommonJS exports in an ES module',
        },
    },
    // @romejs/string-markup
    STRING_MARKUP: {
        UNCLOSED_STRING: 'Unclosed string',
        EXPECTED_CLOSING_TAG_NAME: 'Expected closing tag name',
        UNKNOWN_START: 'Unknown child start',
        EXPECTED_ATTRIBUTE_NAME: 'Expected attribute name',
        INCORRECT_CLOSING_TAG_NAME: (expected, got) => ({
            message: string_markup_1.markup `Expected to close ${expected} but found ${got}`,
        }),
        UNCLOSED_TAG: (tagName, openLocation) => ({
            message: string_markup_1.markup `Unclosed ${tagName} tag`,
            advice: [
                { type: 'log', category: 'info', text: 'Tag started here' },
                {
                    type: 'frame',
                    location: openLocation,
                },
            ],
        }),
        INVALID_ATTRIBUTE_NAME_FOR_TAG: (tagName, attributeName, validAttributes) => ({
            message: string_markup_1.markup `<emphasis>${attributeName}</emphasis> is not a valid attribute name for <emphasis>${tagName}</emphasis>`,
            advice: helpers_1.buildSuggestionAdvice(attributeName, validAttributes),
        }),
        UNKNOWN_TAG_NAME: (tagName) => ({
            message: string_markup_1.markup `Unknown tag name <emphasis>${tagName}</emphasis>`,
        }),
        RESTRICTED_CHILD: (tagName, allowedParents, gotParentName = 'none') => ({
            message: string_markup_1.markup `The tag <emphasis>${tagName}</emphasis> should only appear as a child of ${orJoin(addEmphasis(allowedParents))} not <emphasis>${gotParentName}</emphasis>`,
        }),
        RESTRICTED_PARENT: (tagName, allowedChildren, gotChildName) => ({
            message: string_markup_1.markup `The tag <emphasis>${tagName}</emphasis> should only contain the tags ${orJoin(addEmphasis(allowedChildren))} not <emphasis>${gotChildName}</emphasis>`,
        }),
        RESTRICTED_PARENT_TEXT: (tagName) => ({
            message: string_markup_1.markup `The tag <emphasis>${tagName}</emphasis> should not contain any text`,
        }),
    },
    // @romejs/path-match
    PATH_MATCH: {
        INVALID_PATTERN_SEGMENT_PART: 'Invalid pattern segment part',
        INVALID_PATH_SEGMENT: 'Invalid path segment',
    },
    TESTS: {
        CANCELLED: {
            category: 'tests/cancelled',
            message: 'Test was cancelled',
        },
        UNDECLARED: {
            message: 'No tests declared in this file',
            category: 'tests/noneDeclared',
        },
        LOGS: (advice) => ({
            message: 'Test file produced console logs',
            category: 'tests/logs',
            advice: [
                ...advice,
                {
                    type: 'log',
                    category: 'info',
                    text: 'Only visible when this test file contains failures',
                },
            ],
        }),
    },
    SUPPRESSIONS: {
        UNUSED: (suppression) => {
            let description = '';
            if (suppression.startLine === suppression.endLine) {
                description = `line ${suppression.startLine}`;
            }
            else {
                description += `lines ${suppression.startLine} to ${suppression.endLine}`;
            }
            return {
                message: 'Unused suppression. Did not hide any errors.',
                category: 'suppressions/unused',
                advice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: `This suppression should hide <emphasis>${description}</emphasis>`,
                    },
                ],
            };
        },
        MISSING_SPACE: {
            category: 'suppressions/missingSpace',
            message: 'Missing space between prefix and suppression categories',
        },
        MISSING_TARGET: {
            category: 'suppressions/missingTarget',
            message: 'We could not find a target for this suppression',
        },
        DUPLICATE: (category) => ({
            category: 'suppressions/duplicate',
            message: string_markup_1.markup `Duplicate suppression category <emphasis>${category}</emphasis>`,
        }),
    },
    SNAPSHOTS: {
        MISSING_NEWLINE_AFTER_CODE_BLOCK: 'Newline required after code block',
        MISSING_NEWLINE_BEFORE_CODE_BLOCK: 'Newline required before code block end',
        UNCLOSED_CODE_BLOCK: 'Unclosed code block',
        EXPECTED_CODE_BLOCK_AFTER_HEADING: 'Expected a code block after this heading',
        REDUNDANT: {
            category: 'tests/snapshots/redundant',
            message: 'Snapshot should not exist',
        },
        MISSING: {
            category: 'tests/snapshots/missing',
            message: 'Snapshot does not exist',
        },
        INCORRECT: (expected, got) => ({
            category: 'tests/snapshots/incorrect',
            message: 'Snapshots do not match',
            advice: [
                {
                    type: 'diff',
                    diff: string_diff_1.default(expected, got),
                },
            ],
        }),
        INLINE_COLLISION: {
            category: 'tests/snapshots/inlineCollision',
            message: 'Trying to update this inline snapshot multiple times',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: '<emphasis>t.inlineSnapshot</emphasis> can only be called once. Did you call it in a loop?',
                },
            ],
        },
        INLINE_MISSING_RECEIVED: {
            category: 'tests/snapshots/inlineMissingReceived',
            message: 'This inline snapshot call does not have a received argument',
        },
        INLINE_FROZEN: {
            category: 'tests/snapshots/frozen',
            message: 'Inline snapshot cannot be updated as snapshots are frozen',
        },
        FROZEN: {
            category: 'tests/snapshots/frozen',
            message: 'Snapshot cannot be updated as snapshots are frozen',
        },
        INLINE_BAD_MATCH: {
            category: 'tests/snapshots/incorrect',
            message: 'Inline snapshots do not match',
        },
    },
    BUNDLER: {
        TOP_LEVEL_AWAIT_IN_LEGACY: {
            category: 'bundler/topLevelAwait',
            message: "This module contains a top level await which isn't supported in wrapper mode",
        },
        DETECTED_CYCLE: (localName, target, culprit, path) => {
            function formatPart(part, index) {
                const tagged = `<filelink target="${part}" />`;
                if (part === culprit) {
                    return `<highlight i="0" legend>${tagged}</highlight>`;
                }
                else if (part === target) {
                    return `<highlight i="1" legend>${tagged}</highlight>`;
                }
                else if (index === 0) {
                    return `${tagged} <inverse>ENTRY</inverse>`;
                }
                else {
                    return tagged;
                }
            }
            return {
                category: 'bundler/moduleCycle',
                message: `The variable <emphasis>${localName}</emphasis> won't be initialized yet`,
                advice: [
                    {
                        type: 'log',
                        category: 'info',
                        text: 'This is because the module it belongs to wont be executed yet. This is due to a circular dependency creating a module cycle.',
                    },
                    {
                        type: 'log',
                        category: 'info',
                        text: `The likely cause is the file ${formatPart(culprit)} that was required by ${formatPart(target)} which created a circular dependency:`,
                    },
                    {
                        type: 'list',
                        reverse: true,
                        ordered: true,
                        list: path.map(formatPart),
                    },
                ],
            };
        },
    },
    RESOLVER: {
        NOT_FOUND: (responseType, source, location) => {
            let messagePrefix = '';
            let category = 'resolver/notFound';
            switch (responseType) {
                case 'UNSUPPORTED': {
                    messagePrefix = `Unsupported`;
                    category = 'resolver/unsupported';
                    break;
                }
                case 'MISSING': {
                    messagePrefix = `Cannot find`;
                    break;
                }
                case 'FETCH_ERROR': {
                    messagePrefix = 'Failed to fetch';
                    category = 'resolver/fetchFailed';
                    break;
                }
            }
            return {
                message: messagePrefix +
                    string_markup_1.markup ` <emphasis>${source}</emphasis> from <filelink emphasis target="${location.filename}" />`,
                category,
            };
        },
        IMPORT_TYPE_MISMATCH: (exportName, source, importedAsKing, actualKind, exportLoc) => ({
            category: 'resolver/importTypeMismatch',
            message: `The export <emphasis>${exportName}</emphasis> in <filelink emphasis target="${source}" /> was incorrectly imported as a <emphasis>${importedAsKing}</emphasis> when it's actually a <emphasis>${actualKind}</emphasis>`,
            advice: exportLoc && [
                {
                    type: 'log',
                    category: 'info',
                    text: `Export was defined here in <filelink emphasis target="${exportLoc.filename}" />`,
                },
                {
                    type: 'frame',
                    location: exportLoc,
                },
            ],
        }),
        UNKNOWN_EXPORT: (name, source, exportedNames, formatExportedName) => ({
            message: `Couldn't find export <emphasis>${name}</emphasis> in <filelink emphasis target="${source}" />`,
            category: 'resolver/unknownExport',
            advice: exportedNames.length === 0
                ? [
                    {
                        type: 'log',
                        category: 'info',
                        text: "This file doesn't have any exports",
                    },
                ]
                : helpers_1.buildSuggestionAdvice(name, exportedNames, {
                    formatItem: (name) => {
                        const { location, source } = formatExportedName(name);
                        if (location !== undefined) {
                            if (location.start === undefined) {
                                name = string_markup_1.markup `<filelink target="${location.filename}">${name}</filelink>`;
                            }
                            else {
                                name = string_markup_1.markup `<filelink target="${location.filename}" line="${location.start.line}" column="${location.start.column}">${name}</filelink>`;
                            }
                        }
                        if (source !== undefined) {
                            name += string_markup_1.markup ` <dim>(from <filelink target="${source}" />)</dim>`;
                        }
                        return name;
                    },
                }),
        }),
        UNKNOWN_EXPORT_POSSIBLE_UNEXPORTED_LOCAL: (name, source, location) => ({
            message: string_markup_1.markup `Couldn't find export <emphasis>${name}</emphasis> in <filelink emphasis target="${source}" />`,
            category: 'resolver/unknownExport',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `However we found a matching local variable in <filelink emphasis target="${location.filename}" />. Did you forget to export it?`,
                },
                {
                    type: 'frame',
                    location,
                },
            ],
        }),
    },
    SPDX: {
        UNKNOWN_LICENSE: (id, knownLicenses) => ({
            message: string_markup_1.markup `Unknown SPDX license <emphasis>${id}</emphasis>`,
            advice: helpers_1.buildSuggestionAdvice(id, knownLicenses),
        }),
        VALID_LICENSE_WITH_MISSING_DASH: (possibleCorrectLicense) => ({
            message: `Missing dash between SPDX license name and version`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: `Did you mean <emphasis>${possibleCorrectLicense}</emphasis>?`,
                },
            ],
        }),
        WITH_RIGHT_LICENSE_ONLY: 'Only a license id can be on the right side of a WITH',
        OPERATOR_NOT_BETWEEN_EXPRESSION: 'Can only use AND/OR in between an expression',
        PLUS_NOT_AFTER_LICENSE: 'A plus can only come after a license id',
        UNOPENED_PAREN: 'Nothing open to close',
    },
    // @romejs/js-parser
    JS_PARSER: {
        FLOW_ANNOTATION_WITH_TYPESCRIPT_ENABLED: 'Cannot have a @flow annotation comment when TypeScript syntax has been enabled',
        UNTERMINATED_BLOCK_COMMENT: 'Unterminated comment',
        UNTERMINATED_JSX_STRING: 'Unterminated string constant',
        INVALID_UNICODE_ESCAPE: 'Invalid Unicode escape',
        EXPECTED_UNICODE_ESCAPE: 'Expecting Unicode escape sequence \\uXXXX',
        BAD_HEX_ESCAPE: 'Bad character escape sequence',
        OCTAL_IN_STRICT_MODE: 'Octal literal in strict mode',
        UNTERMINATED_TEMPLATE: 'Unterminated template',
        UNTERMINATED_STRING: 'Unterminated string constant',
        OUT_OF_BOUND_CODE_POINT: 'Code point out of bounds',
        IDENTIFIER_AFTER_NUMBER: 'Identifier directly after number',
        OCTAL_BIGINT: "A bigint can't be an octal",
        DECIMAL_BIGINT: "A bigint can't have a decimal",
        INVALID_NUMBER: 'Invalid number',
        LEGACY_OCTAL_IN_STRICT_MODE: 'Legacy octal literals are not allowed in strict mode',
        INVALID_INT_TOKEN: 'Invalid or unexpected int token',
        UNICODE_ESCAPE_IN_REGEX_FLAGS: "Regular expression flags can't contain unicode escapes",
        UNTERMINATED_REGEX: 'Unterminated regular expression',
        DANGLING_BACKSLASH_IN_REGEX: 'Dangling backslash in a regular expression',
        EXPECTED_RELATIONAL_OPERATOR: 'Expected relational operator',
        UNEXPECTED_SPACE: 'Unexpected space',
        EXPECTED_SEMI_OR_LINE_TERMINATOR: 'Expected a semicolon or a line terminator',
        GET_SET_CLASS_CONSTRUCTOR: "Constructor can't have get/set modifier",
        ASYNC_CLASS_CONSTRUCTOR: 'Constructor cannot be async',
        GENERATOR_CLASS_CONSTRUCTOR: 'Constructor cannot be a generator',
        DUPLICATE_CLASS_CONSTRUCTOR: 'Duplicate constructor in the same class',
        UNKNOWN_CLASS_PROPERTY_START: 'Unknown class property start',
        CLASS_STATIC_PROTOTYPE_PROPERTY: 'Classes may not have static property named prototype',
        CLASS_PRIVATE_FIELD_NAMED_CONSTRUCTOR: "Classes may not have a private field named '#constructor'",
        CLASS_PROPERTY_NAME_CONSTRUCTOR: "Classes may not have a non-static field named 'constructor'",
        PROTO_PROP_REDEFINITION: 'Redefinition of __proto__ property',
        MISSING_CONDITIONAL_SEPARATOR: 'Missing conditional expression consequent separator',
        WRAP_EXPONENTIATION: 'Illegal expression. Wrap left hand side or entire exponentiation in parentheses.',
        DELETE_LOCAL_VARIABLE_IN_STRICT: 'Deleting local variable in strict mode',
        DELETE_PRIVATE_FIELD: 'Deleting a private field is not allowed',
        TAGGED_TEMPLATE_IN_OPTIONAL_CHAIN: 'Tagged Template Literals are not allowed in optionalChain',
        YIELD_NAME_IN_GENERATOR: "Can not use 'yield' as identifier inside a generator",
        AWAIT_NAME_IN_ASYNC: "Can not use 'await' as identifier inside an async function",
        EMPTY_PARENTHESIZED_EXPRESSION: 'Parenthesized expression didnt contain anything',
        AWAIT_IN_ASYNC_PARAMS: 'await is not allowed in async function parameters',
        YIELD_IN_GENERATOR_PARAMS: 'yield is not allowed in generator parameters',
        PARENTHESIZED_FUNCTION_PARAMS: "Function parameters can't be parenthesized",
        NEW_WITH_TYPESCRIPT_TYPE_ARGUMENTS_NO_PARENS: 'In TypeScript, a new expression with type arguments must have parens',
        INVALID_TEMPLATE_ESCAPE: 'Invalid escape sequence in template',
        EXPECTED_IDENTIFIER: 'Expected an identifier',
        IMPORT_EXACT_ARGUMENTS: 'import() requires exactly one argument',
        IMPORT_TRAILING_COMMA: 'Trailing comma is disallowed inside import(...) arguments',
        IMPORT_SPREAD: 'Spread is not allowed in import()',
        IMPORT_NEW_CALLEE: 'Cannot use new with import(...)',
        SUPER_OUTSIDE_METHOD: 'super is only allowed in object methods and classes',
        INVALID_SUPER_SUFFIX: 'Invalid super suffix operator',
        AWAIT_OUTSIDE_ASYNC: "Can't use await outside of an async function",
        AWAIT_STAR: 'await* has been removed from the async functions proposal. Use Promise.all() instead.',
        NEW_TARGET_OUTSIDE_CLASS: 'new.target can only be used in functions or class properties',
        MULTIPLE_DESTRUCTURING_RESTS: 'Cannot have multiple rest elements when destructuring',
        TRAILING_COMMA_AFTER_REST: 'A trailing comma is not permitted after the rest element',
        GETTER_WITH_PARAMS: 'getter should have no parameters',
        SETTER_WITH_REST: 'setter function argument must not be a rest parameter',
        SETTER_NOT_ONE_PARAM: 'setter should have exactly one param',
        ASYNC_GETTER_SETTER: "An object setter/getter can't be async",
        GENERATOR_GETTER_SETTER: "An object setter/getter can't be a generator",
        ARGUMENTS_IN_CLASS_FIELD: "'arguments' is not allowed in class field initializer",
        NON_SIMPLE_PARAM_IN_EXPLICIT_STRICT_FUNCTION: 'Non-simple parameter in strict mode',
        STRICT_DIRECTIVE_IN_NON_SIMPLE_PARAMS: "Illegal 'use strict' directive in function with non-simple parameter list",
        OBJECT_PROPERTY_WITH_TYPE_PARAMETERS: 'Object property cannot have type parameters',
        ILLEGAL_VARIANCE: 'Variance is not allowed here',
        OBJECT_METHOD_IN_PATTERN: "Object methods aren't allowed in object patterns",
        IMPORT_META_OUTSIDE_MODULE: `import.meta may only appear in a module`,
        EXPECTED_ARROW_AFTER_ASYNC_TYPE_PARAMS: 'Expected arrow because we are a possible async arrow and type annotated parameters were present',
        INVALID_OBJECT_PATTERN_PROP: 'Invalid property node for object pattern',
        ASYNC_OBJECT_METHOD_LINE_BREAK: "There shouldn't be any newlines between async and the rest of the function",
        SPACE_BETWEEN_PRIVATE_HASH: 'Unexpected space between # and identifier',
        CONFUSING_CALL_ARGUMENT: 'Function parameter type annotation? Possibly forgot curlies around an object. Possibly forgot async keyword.',
        EXPECTED_ARROW_AFTER_TYPE_PARAMS: 'Expected an arrow function after this type parameter declaration',
        REQUIRED_CLASS_NAME: 'Class name is required',
        JSX_ELEM_TYPE_ARGUMENTS_OUTSIDE_TS: 'JSX element type arguments are only allowed in TS',
        UNWRAPPED_ADJACENT_JHX: `Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>?`,
        CONFUSED_OR: 'Unexpected ||, did you mean just |?',
        INVALID_ASSIGNMENT_TARGET: 'Not a valid assignment target',
        IMPORT_KIND_SPECIFIER_ON_IMPORT_DECLARATION_WITH_KIND: 'The `type` and `typeof` keywords on named imports can only be used on regular `import` statements. It cannot be used with `import type` or `import typeof` statements',
        DESTRUCTURING_IN_IMPORT: 'ES2015 named imports do not destructure. Use another statement for destructuring after the import.',
        IMPORT_TYPE_STAR: 'import * is not allowed',
        IMPORT_MISSING_SOURCE: 'import missing a source',
        EXPORT_TYPE_NAMESPACE: "Can't have a type export namespacer specifier",
        EXPORT_MISSING_FROM: 'Expected `from` for an export node',
        EXPORT_FROM_NOT_STRING: 'Export from only allows strings',
        BINDING_MEMBER_EXPRESSION: 'Binding member expression',
        INVALID_OBJECT_PATTERN_PROPERTY: 'Not a valid assignment object pattern property',
        OBJECT_PATTERN_CANNOT_CONTAIN_METHODS: 'Object pattern cannot contains methods',
        INVALID_ASSIGNMENT_PATTERN_OPERATOR: "Only '=' operator can be used for specifying default value.",
        INVALID_OBJECT_REST_ARGUMENT: "Invalid rest operator's argument",
        INVALID_EXPORT_DEFAULT: 'Only expressions, functions or classes are allowed as the `default` export.',
        INVALID_EXPORT_DECLARATION: 'Invalid export declaration',
        DESTRUCTURING_REST_ELEMENT_NOT_LAST: `The rest element has to be the last element when destructuring`,
        REST_INVALID_ARGUMENT: "Invalid rest operator's argument",
        EXPORT_ASYNC_NO_FUNCTION_KEYWORD: 'Started with `export async` so we expected to receive an async function but no function keyword was found',
        TYPE_CAST_WITHOUT_ANNOTATION: 'Type cast expression has no type annotation. Did you mean for this to be a function parameter?',
        TYPE_CAST_CANNOT_BE_OPTIONAL: 'Type cast expressions cannot be optional. Did you mean for this to be a function parameter?',
        TYPE_CAST_EXPECTED_PARENS: 'The type cast expression is expected to be wrapped with parentheses',
        FLOW_SPACE_BETWEEN_PERCENT_CHECKS: 'Spaces between \xb4%\xb4 and \xb4checks\xb4 are not allowed here.',
        FLOW_BAD_UNDERSCORE_NAME: '`_` is only allowed as a type argument to call or new',
        FLOW_UNINFERRABLE_PREDICATE_ON_FUNCTION: 'Predicate function declarations need to declare a predicate expression',
        FLOW_DECLARE_MODULE_IN_DECLARE_MODULE: '`declare module` cannot be used inside another `declare module`',
        FLOW_UNKNOWN_DECLARATION_START: 'Unknown start to Flow declaration',
        FLOW_IMPORT_KINDLESS_IN_DECLARE_MODULE: 'Imports within a `declare module` body must always be `import type` or `import typeof`',
        FLOW_MIXED_DECLARE_EXPORTS: 'Found both `declare module.exports` and `declare export` in the same module. Modules can only have 1 since they are either an ES module or they are a CommonJS module',
        FLOW_DUPLICATE_DECLARE_MODULE_EXPORTS: 'Duplicate `declare module.exports` statement',
        FLOW_DISALLOW_DEFAULT_TYPE_PARAMETER: 'Default type parameters arent allowed here',
        FLOW_DISALLOWED_SPREAD: 'Spread operator cannot appear in class or interface definitions',
        FLOW_DEFAULT_TYPE_PARAMETER_REQUIRED: 'Type parameter declaration needs a default, since a preceding type parameter declaration has a default.',
        FLOW_INEXACT_SYNTAX_NOT_ALLOWED: 'Explicit inexact syntax is only allowed inside inexact objects',
        FLOW_INEXACT_CANNOT_APPEAR_IN_EXPLICIT_EXACT: 'Explicit inexact syntax cannot appear inside an explicit exact object type',
        FLOW_INEXACT_MUST_BE_AT_END: 'Explicit inexact syntax must appear at the end of an inexact object',
        FLOW_TYPE_CAST_IN_TS: "Flow type cast expressions aren't allowed in TypeScript",
        TYPE_NUMERIC_LITERAL_PLUS: 'Numeric literal type annotations cannot stand with a +, omit it instead',
        TYPE_NUMERIC_LITERAL_EXPECTED: `Unexpected token, expected "number"`,
        FLOW_INVALID_ASYNC_ARROW_WITH_TYPE_PARAMS: 'Invalid async arrow with type parameters',
        FLOW_UNKNOWN_PRIMARY_START: 'Unknown flow primarty type start',
        FLOW_UNKNOWN_DECLARE_EXPORT_START: 'No valid start for Flow declare export declaration found',
        FLOW_DECLARE_MODULE_INVALID_CHILD: 'Only declares and type imports are allowed inside declare module',
        JSX_INVALID_ATTRIBUTE_VALUE: 'JSX attribute value should be either an expression or a quoted JSX text',
        JSX_UNCLOSED_SELF_CLOSING_TAG: 'Unclosed JSX element open',
        JSX_UNCLOSED_CLOSING_TAG: 'Unclosed JSX element close',
        JSX_EMPTY_ATTRIBUTE_VALUE: 'JSX attribute cannot be an empty expression',
        JSX_UNKNOWN_IDENTIFIER_TOKEN: 'Unknown JSX identifier token',
        TS_IMPORT_ARG_NOT_STRING: 'Argument in a type import must be a string literal',
        TS_CONSTANT_NOT_LITERAL: 'Only literal values are allowed as a constant type',
        TS_INVALID_SIGNATURE_BINDING_NODE: 'Invalid node in signature binding list',
        TS_REQUIRED_FOLLOWS_OPTIONAL: 'A required element cannot follow an optional element.',
        TS_TEMPLATE_LITERAL_WITH_SUBSTITUION: 'Template literal types cannot have any substitution',
        TS_UNKNOWN_NON_ARRAY_START: 'Unknown TS non array type start',
        TS_INVALID_READONLY_MODIFIER: "'readonly' type modifier is only permitted on array and tuple literal types.",
        TS_EXTERNAL_MODULE_REFERENCE_ARG_NOT_STRING: 'TypeScript require() must have a single string argument',
        TS_UNKNOWN_DECLARE_START: 'Unknown TypeScript declare start',
        TS_UNEXPECTED_CAST_IN_PARAMETER_POSITION: 'Unexpected type cast in parameter position',
        TS_DISABLED_BUT_ACCESSIBILITY_OR_READONLY: 'Accessibility and readonly syntax found but TS is not enabled',
        TS_PARAMETER_PROPERTY_BINDING_PATTERN: 'A parameter property may not be declared using a binding pattern.',
        TYPE_ANNOTATION_AFTER_ASSIGNMENT: 'Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`',
        TYPE_BINDING_PARAMETER_OPTIONAL: 'A binding pattern parameter cannot be optional in an implementation signature.',
        ILLEGAL_FUNCTION_IN_STRICT: 'In strict mode code, functions can only be declared at top level or inside a block',
        ILLEGAL_FUNCTION_IN_NON_STRICT: 'In non-strict mode code, functions can only be declared at top level, inside a block, or as the body of an if statement',
        ILLEGAL_GENERATOR_DEFINITION: 'Generators can only be declared at the top level or inside a block',
        ILLEGAL_ASYNC_DEFINITION: 'Async functions can only be declared at the top level or inside a block',
        LEXICAL_DECLARATION_IN_SINGLE_STATEMENT_CONTEXT: 'Lexical declaration cannot appear in a single-statement context',
        IMPORT_EXPORT_MUST_TOP_LEVEL: "'import' and 'export' may only appear at the top level",
        REGULAR_FOR_AWAIT: "Can't have an await on a regular for loop",
        RETURN_OUTSIDE_FUNCTION: "'return' outside of function",
        MULTIPLE_DEFAULT_CASE: 'Multiple default clauses',
        SWITCH_STATEMENT_OUTSIDE_CASE: 'Statement outside of a case or default block',
        NEWLINE_AFTER_THROW: 'Illegal newline after throw',
        TRY_MISSING_FINALLY_OR_CATCH: 'Missing catch or finally clause',
        INVALID_LABEL_DECLARATION: 'Invalid labeled declaration',
        WITH_IN_STRICT: "'with' in strict mode",
        OCTAL_IN_STRICT: 'Octal literal in strict mode',
        FOR_IN_OF_WITH_INITIALIZER: 'Loop variable declaration may not have an initializer',
        CONST_WITHOUT_INITIALIZER: 'A constant must have an initializer',
        COMPLEX_BINDING_WITHOUT_INITIALIZER: 'Complex binding patterns require an initialization value',
        ACCESSOR_WITH_TYPE_PARAMS: 'An accessor cannot have type parameters',
        UNEXPECTED_SPREAD: 'Unexpected spread',
        DUPLICATE_LABEL: (label, loc) => ({
            message: string_markup_1.markup `Label <emphasis>${label}</emphasis> is already declared`,
            advice: helpers_1.buildDuplicateLocationAdvice([loc]),
        }),
        UNKNOWN_LABEL: (label) => ({
            message: label === undefined
                ? 'No loop label found'
                : string_markup_1.markup `Unknown label <emphasis>${label}</emphasis>`,
        }),
        IMPORT_EXPORT_IN_SCRIPT: (manifestPath) => ({
            message: `<emphasis>import</emphasis> and <emphasis>export</emphasis> can only appear in a module`,
            advice: [
                // TODO this advice is pointless if you have syntax extensions enabled
                {
                    type: 'log',
                    category: 'info',
                    text: 'Change the extension to <emphasis>.mjs</emphasis> to turn this file into a module',
                },
                {
                    type: 'log',
                    category: 'info',
                    text: `Add <emphasis>"type": "module"</emphasis> to your <filelink emphasis target="${manifestPath}" />`,
                },
            ],
        }),
        SUPER_CALL_OUTSIDE_CONSTRUCTOR: {
            message: 'super() is only valid inside a class constructor of a subclass',
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: "Maybe a typo in the method name ('constructor') or not extending another class?",
                },
            ],
        },
        JSX_DISABLED: {
            message: "JSX syntax isn't enabled",
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Are you using <emphasis>TypeScript</emphasis>? Change the file extension to <emphasis>.tsx</emphasis>',
                },
                {
                    type: 'log',
                    category: 'info',
                    text: 'Are you using <emphasis>Flow</emphasis>? Add a <emphasis>@flow</emphasis> comment annotation to the top of the file',
                },
                {
                    type: 'log',
                    category: 'info',
                    text: 'Not using either? Change the file extension to <emphasis>.jsx</emphasis>',
                },
            ],
        },
        JSX_IN_TS_EXTENSION: {
            message: "JSX isn't allowed in regular TypeScript files",
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Change the file extension to <emphasis>.tsx</emphasis> to enable JSX support',
                },
            ],
        },
        INVALID_PARENTEHSIZED_LVAL: (patternType) => ({
            message: 'Invalid parenthesized binding',
            advice: patternType === 'object'
                ? [
                    {
                        type: 'log',
                        category: 'info',
                        text: 'Did you use `({a}) = 0` instead of `({a} = 0)`?',
                    },
                ]
                : patternType === 'array'
                    ? [
                        {
                            type: 'log',
                            category: 'info',
                            text: 'Did you use `([a]) = 0` instead of `([a] = 0)`?',
                        },
                    ]
                    : [],
        }),
        EXPECTED_COMMA_SEPARATOR: (context) => ({
            message: `Expected a comma to separate items in ${context}`,
        }),
        INVALID_LEFT_HAND_SIDE: (context) => ({
            message: `Invalid left-hand side in ${context}`,
        }),
        TS_EMPTY_LIST: (descriptor) => ({
            message: `${descriptor} list cannot be empty`,
        }),
        JSX_EXPECTED_CLOSING_TAG: (name, openingLoc) => ({
            message: `Expected a corresponding JSX closing tag for <emphasis>${name}</emphasis>`,
            advice: buildJSXOpeningAdvice(name, openingLoc),
        }),
        JSX_EXPECTED_CLOSING_FRAGMENT_TAG: (name, openingLoc) => ({
            message: 'Expected JSX closing fragment tag',
            advice: buildJSXOpeningAdvice(name, openingLoc),
        }),
        JSX_UNKNOWN_CHILD_START: (name, openingLoc) => ({
            message: 'Unknown JSX children start',
            advice: buildJSXOpeningAdvice(name, openingLoc),
        }),
        JSX_UNCLOSED_ELEMENT: (name, openingLoc) => ({
            message: 'Unclosed JSX element',
            advice: buildJSXOpeningAdvice(name, openingLoc),
        }),
        FLOW_RESERVED_TYPE: (word) => ({
            message: `Cannot overwrite primitive type ${word}`,
        }),
        FLOW_DECLARE_EXPORT_UNSUPPORTED: (label, suggestion) => ({
            message: `\`declare export ${label}\` is not supported. Use \`${suggestion}\` instead`,
        }),
        FLOW_REQUIRED: (label) => ({
            message: `A ${label} is only valid inside of a Flow file`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'To enable <emphasis>Flow</emphasis> support, add a <emphasis>@flow</emphasis> comment annotation to the top of the file',
                },
            ],
        }),
        TS_REQUIRED: (label) => ({
            message: `A ${label} is only valid inside of a TypeScript file`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'To enable <emphasis>TypeScript</emphasis> support, the file extension should end in <emphasis>.ts</emphasis> or <emphasis>.tsx</emphasis>',
                },
            ],
        }),
        FLOW_OR_TEST_REQUIRED: (label) => ({
            message: `A ${label} is only valid inside of a TypeScript or Flow file`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Did you mean <emphasis>TypeScript</emphasis>? Change the file extension to <emphasis>.ts</emphasis> or <emphasis>.tsx</emphasis>',
                },
                {
                    type: 'log',
                    category: 'info',
                    text: 'Did you mean <emphasis>Flow</emphasis>? Add a <emphasis>@flow</emphasis> comment annotation to the top of the file',
                },
            ],
        }),
        DUPLICATE_EXPORT: (name, existing) => ({
            message: name === 'default'
                ? 'Only one default export allowed per module.'
                : `\`${name}\` has already been exported. Exported identifiers must be unique.`,
            advice: helpers_1.buildDuplicateLocationAdvice([existing]),
        }),
        NEW_IN_OPTIONAL_CHAIN: (responsiblePointer) => ({
            message: 'constructors in/after an Optional Chain are not allowed',
            advice: responsiblePointer && [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Optional chain member responsible',
                },
                {
                    type: 'frame',
                    location: responsiblePointer,
                },
            ],
        }),
        UNKNOWN_EXPRESSION_ATOM_START: (context) => ({
            message: `Unknown start to an ${context}`,
        }),
        INVALID_META_PROPERTY: (metaName, propertyName) => ({
            message: `The only valid meta property for ${metaName} is ${metaName}.${propertyName}`,
        }),
        ARGUMENT_CLASH_IN_STRICT: (name, loc) => ({
            message: string_markup_1.markup `Argument <emphasis>${name}</emphasis> name clash in strict mode`,
            advice: helpers_1.buildDuplicateLocationAdvice([loc]),
        }),
        RESERVED_WORD: (word) => ({
            message: `${word} is a reserved word`,
        }),
        UNEXPECTED_KEYWORD: (keyword) => ({
            message: `Unexpected keyword ${keyword}`,
        }),
        UNEXPECTED_TOKEN: (expected, possibleShiftMistake) => ({
            message: expected === undefined
                ? 'Unexpected token'
                : `Unexpected token, expected ${expected}`,
            advice: possibleShiftMistake
                ? [
                    {
                        type: 'log',
                        category: 'info',
                        text: `Did you accidently hold shift?`,
                    },
                ]
                : [],
        }),
        EXPECTED_CLOSING: (name, char, location) => ({
            message: `Unclosed ${name}`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: `We expected to find the closing character <emphasis>${char}</emphasis> here`,
                },
                {
                    type: 'frame',
                    location,
                },
            ],
        }),
        EXPECTED_KEYWORD: (keyword) => ({
            message: string_markup_1.markup `Expected keyword ${keyword}`,
        }),
        ESCAPE_SEQUENCE_IN_WORD: (word) => ({
            message: string_markup_1.markup `${word} can't contain a unicode escape`,
        }),
        EXPECTED_ENABLE_SYNTAX: (syntaxName) => ({
            message: string_markup_1.markup `Expected ${syntaxName} syntax to be enabled`,
        }),
        UNEXPECTED_HASH: (exclamationFollowed) => ({
            message: 'Unexpected character #',
            advice: exclamationFollowed
                ? [
                    {
                        type: 'log',
                        category: 'info',
                        text: 'Did you want to write a hashbang? A hashbang can only be the first thing in a file.',
                    },
                ]
                : [],
        }),
        UNEXPECTED_UNICODE_CHARACTER: (char, unicodeName, equivalentChar, equivalentName) => ({
            message: string_markup_1.markup `Unexpected Unicode character '<emphasis>${char}</emphasis>' (<emphasis>${unicodeName}</emphasis>)`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: string_markup_1.markup `Did you mean '<emphasis>${equivalentChar}</emphasis>' (<emphasis>${equivalentName}</emphasis>)? Both characters look the same, but are not.`,
                },
            ],
        }),
        EXPECTED_NUMBER_IN_RADIX: (radix) => ({
            message: `Expected number in radix ${String(radix)}`,
        }),
        INVALID_IDENTIFIER_NAME: (name) => ({
            message: `Invalid identifier ${name}`,
        }),
        ESCAPE_SEQUENCE_IN_KEYWORD: (keyword) => ({
            message: `Escape sequence in keyword ${keyword}`,
        }),
    },
    // @romejs/js-analysis
    TYPE_CHECK: {
        NOT_CALLABLE: {
            category: 'typeCheck/uncallable',
            message: `This type isn't callable`,
        },
        INCOMPATIBILITY: (upper, originLoc) => ({
            category: 'typeCheck/incompatible',
            message: 'Type incompatibility found',
            advice: [
                {
                    type: 'log',
                    category: 'error',
                    text: `This type is incompatible with expected type of`,
                },
                originLoc === undefined
                    ? {
                        type: 'log',
                        category: 'info',
                        text: upper,
                    }
                    : {
                        type: 'frame',
                        location: {
                            ...originLoc,
                            marker: upper,
                        },
                    },
            ],
        }),
        UNKNOWN_IMPORT: (importedName, source, possibleNames) => ({
            category: 'typeCheck/unknownImport',
            message: `Unknown import '${importedName}' in '${source}'`,
            advice: helpers_1.buildSuggestionAdvice(importedName, possibleNames),
        }),
        UNKNOWN_PROP: (key, possibleNames) => ({
            message: string_markup_1.markup `Property ${key} not found in`,
            category: 'typeCheck/unknownProperty',
            advice: helpers_1.buildSuggestionAdvice(key, possibleNames),
        }),
        UNDECLARED_VARIABLE: (name, possibleNames) => ({
            category: 'typeCheck/undeclaredVariable',
            message: string_markup_1.markup `Undeclared variable ${name}`,
            advice: helpers_1.buildSuggestionAdvice(name, possibleNames),
        }),
        NOT_EXHAUSTIVE: (only, target) => ({
            category: 'typeCheck/notExhaustive',
            //message += `but allows ${this.extraenous.map(type => this.utils.humanize(type)).join(' | ')}`;
            message: `Expected only a ${only} but got ${target}`,
        }),
        MISSING_CONDITION: (missing) => ({
            category: 'typeCheck/missingCondition',
            message: `Missing the conditions ${missing.join(', ')}`,
        }),
    },
    // @romejs/consume
    CONSUME: {
        SET_PROPERTY_NON_OBJECT: 'Attempted to set a property on a non-object',
        EXPECTED_JSON_VALUE: 'Expected a JSON value',
        EXPECTED_OBJECT: 'Expected object',
        EXPECTED_ARRAY: 'Expected array',
        EXPECTED_DATE: 'Expected a date',
        EXPECTED_BOOLEAN: 'Expected a boolean',
        EXPECTED_STRING: 'Expected a string',
        EXPECTED_BIGINT: 'Expected a bigint',
        EXPECTED_NUMBER: 'Expected a number',
        EXPECTED_URL: 'Expected a URL',
        EXPECTED_VALID_NUMBER: 'Expected valid number',
        EXPECTED_ABSOLUTE_PATH: 'Expected an absolute file path',
        EXPECTED_RELATIVE_PATH: 'Expected a relative file path',
        EXPECTED_EXPLICIT_RELATIVE_PATH: 'Expected an explicit relative file path. This is one that starts with <emphasis>./</emphasis> or <emphasis>../</emphasis>',
        INVALID: 'Invalid value',
        EXPECTED_NUMBER_BETWEEN: (min, max) => ({
            message: `Expected number between ${min} and ${max}`,
        }),
        EXPECTED_NUMBER_HIGHER: (num) => ({
            message: `Expected number higher than ${num}`,
        }),
        EXPECTED_NUMBER_LOWER: (num) => ({
            message: `Expected number lower than ${num}`,
        }),
        INVALID_STRING_SET_VALUE: (value, validValues) => ({
            message: string_markup_1.markup `Invalid value <emphasis>${value}</emphasis>`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: 'Possible values are',
                },
                {
                    type: 'list',
                    list: validValues.map((str) => string_markup_1.escapeMarkup(str)),
                },
            ],
        }),
        UNUSED_PROPERTY: (key, type, knownProperties) => ({
            message: string_markup_1.markup `Unknown <emphasis>${key}</emphasis> ${type}`,
            advice: helpers_1.buildSuggestionAdvice(key, knownProperties, {
                ignoreCase: true,
            }),
        }),
    },
    // @romejs/codec-js-manifest
    MANIFEST: {
        TOO_MANY_HASH_PARTS: 'Too many hashes',
        MISSING_HOSTED_GIT_USER: 'Missing user',
        MISSING_HOSTED_GIT_REPO: 'Missing repo',
        TOO_MANY_HOSTED_GIT_PARTS: 'Expected only 2 parts',
        EMPTY_NPM_PATTERN: 'Missing rest of npm dependency pattern',
        TOO_MANY_NPM_PARTS: 'Too many @ signs',
        STRING_BIN_WITHOUT_NAME: 'A string bin is only allowed if the manifest has a name property',
        MISSING_REPO_URL: 'Missing repo URL',
        MIXED_EXPORTS_PATHS: 'Cannot mix a root conditional export with relative paths',
        NAME_EXCEEDS: `cannot exceed 214 characters`,
        INVALID_NAME_START: `cannot start with a dot or underscore`,
        ORG_WITH_NO_PACKAGE_NAME: `contains an org but no package name`,
        ORG_TOO_MANY_PARTS: `contains too many name separators`,
        REDUNDANT_ORG_NAME_START: 'Redundant <emphasis>@</emphasis> in org name',
        INVALID_NAME_CHAR: (char) => ({
            message: string_markup_1.markup `The character <emphasis>${char}</emphasis> isn't allowed`,
        }),
        INCORRECT_CASING: (typoKey, correctKey) => ({
            message: `${typoKey} has incorrect casing, should be ${correctKey}`,
        }),
        INCORRECT_CAMEL_CASING: (typoKey, correctKey) => ({
            message: `${typoKey} isn't correctly camel cased when it should be ${correctKey}`,
        }),
        TYPO: (typoKey, correctKey) => ({
            message: `${typoKey} is a typo of ${correctKey}`,
        }),
    },
    // @romejs/project
    PROJECT_CONFIG: {
        BOOLEAN_CATEGORY: (enabled) => ({
            message: `Expected an object here but got a boolean`,
            advice: [
                {
                    type: 'log',
                    category: 'info',
                    text: `You likely wanted \`{"enabled": ${String(enabled)}}\` instead`,
                },
            ],
        }),
        RECURSIVE_CONFIG: 'Recursive config',
    },
});
