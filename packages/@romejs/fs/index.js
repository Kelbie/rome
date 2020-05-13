"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("@romejs/path");
const fs = require("fs");
function promisifyData(path, factory) {
    return new Promise((resolve, reject) => {
        factory(path.join(), (err, data) => {
            if (err === null) {
                resolve(data);
            }
            else {
                reject(err);
            }
        });
    });
}
function promisifyVoid(path, factory) {
    return new Promise((resolve, reject) => {
        factory(path.join(), (err) => {
            if (err === null) {
                resolve();
            }
            else {
                reject(err);
            }
        });
    });
}
// watch
function watch(path, options, listener) {
    return fs.watch(path.join(), options, listener);
}
exports.watch = watch;
// readFile
function readFile(path) {
    return promisifyData(path, (filename, callback) => fs.readFile(filename, callback));
}
exports.readFile = readFile;
function readFileSync(path) {
    return fs.readFileSync(path.join());
}
exports.readFileSync = readFileSync;
// readFileText
async function readFileText(path) {
    return (await readFile(path)).toString();
}
exports.readFileText = readFileText;
function readFileTextSync(path) {
    return fs.readFileSync(path.join(), 'utf8');
}
exports.readFileTextSync = readFileTextSync;
// writeFile
function writeFile(path, content) {
    return promisifyVoid(path, (filename, callback) => fs.writeFile(filename, content, callback));
}
exports.writeFile = writeFile;
function writeFileSync(path, content) {
    return fs.writeFileSync(path.join(), content);
}
exports.writeFileSync = writeFileSync;
// readdir
function createReaddirReturn(folder, files) {
    return new path_1.AbsoluteFilePathSet(files.map((basename) => {
        return folder.append(basename);
    }));
}
function readdir(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path.join(), (err, files) => {
            if (err === null) {
                resolve(createReaddirReturn(path, files));
            }
            else {
                reject(err);
            }
        });
    });
}
exports.readdir = readdir;
function readdirSync(path) {
    return createReaddirReturn(path, fs.readdirSync(path.join()));
}
exports.readdirSync = readdirSync;
// lstat
function lstat(path) {
    return promisifyData(path, (filename, callback) => fs.lstat(filename, callback));
}
exports.lstat = lstat;
function lstatSync(path) {
    return fs.lstatSync(path.join());
}
exports.lstatSync = lstatSync;
// exists
function exists(path) {
    return new Promise((resolve) => {
        fs.exists(path.join(), (exists) => {
            resolve(exists);
        });
    });
}
exports.exists = exists;
function existsSync(path) {
    return fs.existsSync(path.join());
}
exports.existsSync = existsSync;
// unlink
function unlink(path) {
    return promisifyVoid(path, (filename, callback) => fs.unlink(filename, (err) => {
        if (err != null && err.code !== 'ENOENT') {
            callback(err);
        }
        else {
            callback(null);
        }
    }));
}
exports.unlink = unlink;
function unlinkSync(path) {
    try {
        fs.unlinkSync(path.join());
    }
    catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}
exports.unlinkSync = unlinkSync;
// createDirectory
function createDirectory(path, opts = {}) {
    return promisifyVoid(path, (filename, callback) => fs.mkdir(filename, {
        recursive: opts.recursive,
    }, callback));
}
exports.createDirectory = createDirectory;
function createDirectorySync(path, opts = {}) {
    fs.mkdirSync(path.join(), { recursive: opts.recursive });
}
exports.createDirectorySync = createDirectorySync;
