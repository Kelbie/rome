"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function setupGlobalErrorHandlers(callback) {
    const onUncaughtException = (err) => {
        callback(err);
    };
    process.on('uncaughtException', onUncaughtException);
    const onUnhandledRejection = (reason, promise) => {
        promise.then(() => {
            throw new Error('Promise is rejected so should never hit this condition');
        }).catch((err) => {
            console.error(err);
            callback(err);
        });
    };
    process.on('unhandledRejection', onUnhandledRejection);
    return () => {
        process.removeListener('uncaughtException', onUncaughtException);
        process.removeListener('unhandledRejection', onUnhandledRejection);
    };
}
exports.default = setupGlobalErrorHandlers;
