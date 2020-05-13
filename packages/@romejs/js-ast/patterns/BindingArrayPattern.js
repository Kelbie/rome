"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.bindingArrayPattern = utils_1.createBuilder('BindingArrayPattern', {
    bindingKeys: {
        elements: true,
        rest: true,
    },
    visitorKeys: {
        elements: true,
        rest: true,
        meta: true,
    },
});
