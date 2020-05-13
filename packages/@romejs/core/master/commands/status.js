"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("../../common/commands");
const commands_2 = require("../commands");
exports.default = commands_2.createMasterCommand({
    category: commands_1.commandCategories.PROCESS_MANAGEMENT,
    description: 'dump memory and process info of master and workers',
    usage: '',
    examples: [],
    defineFlags() {
        return {};
    },
    async callback({ master }) {
        const workers = await Promise.all(master.workerManager.getWorkers().map(async (worker) => {
            const workerStatus = await worker.bridge.status.call();
            return {
                astCacheSize: workerStatus.astCacheSize,
                heapTotal: workerStatus.memoryUsage.heapTotal,
                pid: workerStatus.pid,
                uptime: workerStatus.uptime,
                ownedBytes: worker.byteCount,
                ownedFileCount: worker.fileCount,
            };
        }));
        const { heapTotal } = process.memoryUsage();
        return {
            master: {
                heapTotal,
                pid: process.pid,
                uptime: process.uptime(),
            },
            workers,
            projects: master.projectManager.getProjects().map((project) => {
                return {
                    id: project.id,
                };
            }),
        };
    },
});
