"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("@romejs/fs");
const childProcess = require("child_process");
const TIMEOUT = 10000;
async function exec(command, args) {
    return new Promise((resolve, reject) => {
        const proc = childProcess.spawn(command, args, { timeout: TIMEOUT });
        let stderr = '';
        let stdout = '';
        proc.stdout.on('data', (data) => {
            stdout += data;
        });
        proc.stderr.on('data', (data) => {
            stderr += data;
        });
        function error(message) {
            reject(new Error(`Error while running ${command} ${args.join(' ')}: ${message}. stderr: ${stderr}`));
        }
        proc.on('error', (err) => {
            if (err.code === 'ETIMEDOUT') {
                error(`Timed out after ${TIMEOUT}ms`);
            }
            else {
                error(err.message);
            }
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            }
            else {
                error(`Exited with code ${code}`);
            }
        });
    });
}
function extractFileList(out) {
    const lines = out.trim().split('\n');
    const files = [];
    for (const line of lines) {
        const match = line.trim().match(/^(?:[AM]|\?\?)\s+(.*?)$/);
        if (match != null) {
            files.push(match[1]);
        }
    }
    return files;
}
class VCSClient {
    constructor(root) {
        this.root = root;
        this.trunkBranch = 'unknown';
    }
    getModifiedFiles(branch) {
        throw new Error('unimplemented');
    }
    getUncommittedFiles() {
        throw new Error('unimplemented');
    }
}
exports.VCSClient = VCSClient;
class GitVCSClient extends VCSClient {
    constructor(root) {
        super(root);
        this.trunkBranch = 'master';
    }
    async getUncommittedFiles() {
        const out = await exec('git', ['status', '--short']);
        return extractFileList(out);
    }
    async getModifiedFiles(branch) {
        const out = await exec('git', ['diff', '--name-status', branch]);
        return extractFileList(out);
    }
}
async function getVCSClient(root) {
    if (await fs_1.exists(root.append('.git'))) {
        return new GitVCSClient(root);
    }
    return undefined;
}
exports.getVCSClient = getVCSClient;
