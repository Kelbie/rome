"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_modules_1 = require("./runtime-modules");
const fs_1 = require("@romejs/fs");
const project_1 = require("@romejs/project");
class VirtualModules {
    constructor(master) {
        this.master = master;
        this.runtimeModulesPath = master.userConfig.runtimeModulesPath;
    }
    async init() {
        const { runtimeModulesPath } = this;
        // Materalize virtual files to disk
        // We could technically keep these in memory and never materialize them but
        // this way we can have something to point at on disk for errors etc
        await fs_1.createDirectory(runtimeModulesPath, { recursive: true });
        for (const [name, files] of runtime_modules_1.modules) {
            const modulePath = runtimeModulesPath.append(name);
            await fs_1.createDirectory(modulePath, { recursive: true });
            for (const [basename, content] of files) {
                await fs_1.writeFile(modulePath.append(basename), content);
            }
        }
        // Initialize as project
        const projectConfig = {
            ...project_1.DEFAULT_PROJECT_CONFIG,
            name: 'rome-runtime',
        };
        await this.master.projectManager.addProjectWithConfig({
            projectFolder: runtimeModulesPath,
            meta: project_1.DEFAULT_PROJECT_CONFIG_META,
            config: projectConfig,
        });
        await this.master.memoryFs.watch(runtimeModulesPath, projectConfig);
    }
    resolve(name) {
        if (runtime_modules_1.modules.has(name)) {
            return this.runtimeModulesPath.append(name);
        }
        else {
            return undefined;
        }
    }
}
exports.default = VirtualModules;
