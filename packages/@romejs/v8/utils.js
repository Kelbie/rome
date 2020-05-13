"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function hrTime() {
    const hrtime = process.hrtime(); // [seconds, nanoseconds]
    const ts = hrtime[0] * 1000000 + Math.round(hrtime[1] / 1000); // microseconds
    return ts;
}
exports.hrTime = hrTime;
const FILE_PROTOCOL = 'file://';
function urlToFilename(url) {
    if (url.startsWith(FILE_PROTOCOL)) {
        return url.slice(FILE_PROTOCOL.length);
    }
    else {
        return url;
    }
}
exports.urlToFilename = urlToFilename;
