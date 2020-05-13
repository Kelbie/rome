"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PRECEDENCE = {
    '||': 0,
    '&&': 1,
    '??': 1,
    '|': 2,
    '^': 3,
    '&': 4,
    '==': 5,
    '===': 5,
    '!=': 5,
    '!==': 5,
    '<': 6,
    '>': 6,
    '<=': 6,
    '>=': 6,
    in: 6,
    instanceof: 6,
    '>>': 7,
    '<<': 7,
    '>>>': 7,
    '+': 8,
    '-': 8,
    '*': 9,
    '/': 9,
    '%': 9,
    '**': 10,
};
function getPrecedence(operator) {
    return PRECEDENCE[operator];
}
exports.default = getPrecedence;
