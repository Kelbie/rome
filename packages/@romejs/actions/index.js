"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const testHelpers_1 = require("@romejs/js-compiler/lint/rules/testHelpers");
const run = async () => {
    console.log(testHelpers_1.testLint);
    try {
        const creature = core.getInput('amazing-creature');
        if (creature === 'mosquito') {
            core.setFailed('Sorry, mosquitos are not amazing 🚫🦟');
            return;
        }
        const pusherName = github.context.payload.pusher.name;
        const message = `👋 Hello ${pusherName}! You are an amazing ${creature}! 🙌`;
        core.debug(message);
        core.setOutput('amazing-message', message);
    }
    catch (error) {
        core.setFailed(`Debug-action failure: ${error}`);
    }
};
run();
exports.default = run;
