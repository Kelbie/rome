"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.assignmentArrayPattern = utils_1.createBuilder('AssignmentArrayPattern', {
    bindingKeys: {},
    visitorKeys: {
        elements: true,
        rest: true,
        meta: true,
    },
});
