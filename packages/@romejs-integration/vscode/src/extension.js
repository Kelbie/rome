"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageclient_1 = require("vscode-languageclient");
// rome-ignore resolver/notFound
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
let client;
function crawl(root) {
    return {
        [Symbol.iterator]() {
            return {
                next() {
                    const value = root;
                    root = path.dirname(value);
                    return {
                        value,
                        done: root === '.' || root === '/',
                    };
                },
            };
        },
    };
}
async function tryChain(root, suffix) {
    for (const dir of crawl(root)) {
        const possible = path.join(dir, suffix);
        try {
            await fs.promises.access(possible);
            return possible;
        }
        catch (err) {
        }
    }
    return undefined;
}
async function tryManifest(root) {
    for (const dir of crawl(root)) {
        const manifestLoc = path.join(dir, 'package.json');
        try {
            const content = await fs.promises.readFile(manifestLoc, 'utf8');
            const json = JSON.parse(content);
            if (json.romeLSPBin) {
                return String(path.resolve(dir, json.romeLSPBin));
            }
        }
        catch (err) {
            if (err instanceof SyntaxError || err.code === 'ENOENT') {
                continue;
            }
            else {
                throw err;
            }
        }
    }
    return undefined;
}
async function getRomeLocation() {
    const { workspaceFolders } = vscode.workspace;
    if (workspaceFolders === undefined) {
        return undefined;
    }
    // Find relative to workspace folders
    for (const { uri } of workspaceFolders) {
        if (uri.scheme === 'file') {
            const manifest = await tryManifest(uri.path);
            if (manifest !== undefined) {
                return manifest;
            }
            const nodeModules = await tryChain(uri.path, `node_modules/rome/index.js`);
            if (nodeModules !== undefined) {
                return nodeModules;
            }
        }
    }
    // Find development build
    try {
        const possible = path.join(os.tmpdir(), 'rome-dev', 'index.js');
        await fs.promises.access(possible);
        return possible;
    }
    catch (err) {
    }
    return undefined;
}
async function activate() {
    const outputChannel = vscode.window.createOutputChannel('Rome');
    function log(message) {
        outputChannel.appendLine(message);
    }
    let romePath = await getRomeLocation();
    // If no romePath was found then watch workspace folders until we find one
    if (romePath === undefined) {
        log('No Rome path found. Waiting for workspace folder changes before trying again');
        await new Promise((resolve) => {
            const event = vscode.workspace.onDidChangeWorkspaceFolders(() => {
                getRomeLocation().then((filename) => {
                    if (filename !== undefined) {
                        romePath = filename;
                        event.dispose();
                        resolve();
                    }
                });
            });
        });
    }
    if (romePath === undefined) {
        throw new Error('Should have been defined');
    }
    log(`Discovered Rome path ${romePath}`);
    let serverOptions = {
        module: romePath,
        args: ['lsp'],
        transport: vscode_languageclient_1.TransportKind.stdio,
    };
    let clientOptions = {
        outputChannel,
        documentSelector: [
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'javascriptreact' },
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'typescriptreact' },
            { scheme: 'file', language: 'json' },
        ],
    };
    client = new vscode_languageclient_1.LanguageClient('rome', 'Rome', serverOptions, clientOptions);
    client.start();
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
